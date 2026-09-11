import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLES, ROLE_HOME } from "#lib/auth/current-user";

/**
 * 工作台路由必须挂上角色守卫。
 *
 * 与 `components/status/__tests__/route-states.test.ts` 同一个惯例：
 * 测试住在被测 module 旁边（这里守的是 `#lib/queries/user` 的 requireRole），
 * 而被扫的是 `src/routes/` —— 测试文件不能放进 src/routes，
 * 否则会被 TanStack 的文件路由扫描当成路由（会警告「没有导出 Route」）。
 *
 * ## 抓的是什么错
 *
 * 复制一个工作台路由当新角色的起点，是很自然的事 —— 然后忘了把
 * `requireRole(queryClient, "student")` 里的角色字面量改掉，**页面静默
 * 对所有登录用户开放**。不会报错、不会崩，只是「老师能进学生工作台」。
 *
 * ## 范围怎么定的
 *
 * 不写死 student/teacher/admin：从 `ROLES` × `ROLE_HOME` 推出来。
 * 所以给 ROLES 加第 4 个角色时，这条测试**立刻要求**也有一个受守卫的
 * 工作台路由 —— 与 roles.test.ts「ROLE_HOME 覆盖每一个角色」配套：
 * 那边保证有落点，这边保证落点的门是锁着的。
 *
 * ## 它不证明什么
 *
 * 它只断言 `requireRole` 出现在了文件里、角色字面量对得上。它**不能**证明
 * 那次调用挂在 `beforeLoad` 上（写在组件里等于没写）。那一层靠 review ——
 * 这里的价值是防回流：别再手写一份三步守卫，别复制错角色。
 */

const ROUTES = "src/routes/authenticated";

/** 去掉注释后再查 —— 说明性注释里会引用写法本身，不该被算作违规。 */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * 角色 → 它的工作台路由文件。
 *
 * 取 `ROLE_HOME[role]` 的第一段路径（`/authenticated/<x>/...`）：
 * student → student.tsx、teacher → teacher.tsx、admin → admin.tsx。
 * 用派生而不是写死映射，是为了让「加角色」这件事只有一个地方要改。
 */
function routeFileFor(role: string): string {
  const segment = ROLE_HOME[role as keyof typeof ROLE_HOME].split("/")[2];
  return join(ROUTES, `${segment}.tsx`).replace(/\\/g, "/");
}

describe("工作台路由的角色守卫", () => {
  it("范围非空（防止路径写错导致空跑）", () => {
    expect(ROLES.length).toBeGreaterThan(2);
  });

  it.each(ROLES.map((r) => [r] as const))(
    "%s 的工作台路由调了 requireRole，且角色字面量对得上",
    (role) => {
      const file = routeFileFor(role);
      const src = stripComments(readFileSync(file, "utf8"));

      expect(src, `${file} 没调 requireRole，这个工作台对所有人开放`).toMatch(/requireRole\s*\(/);
      expect(src, `${file} 的 requireRole 角色字面量不是 "${role}"（复制路由忘改？）`).toMatch(
        new RegExp(`requireRole\\s*\\(\\s*[^,]*,\\s*"${role}"\\s*,?\\s*\\)`),
      );
    },
  );

  it.each(ROLES.map((r) => [r] as const))("%s 的工作台路由不再手写那份三步守卫", (role) => {
    const file = routeFileFor(role);
    const src = stripComments(readFileSync(file, "utf8"));

    // 三步守卫现在是 requireRole 的事。再出现 getCachedCurrentUser
    // 就是在路由里又抄了一份（C4 抽走的正是这个）。
    expect(src, `${file} 又手写了 getCachedCurrentUser，应该走 requireRole`).not.toMatch(
      /getCachedCurrentUser/,
    );
  });
});
