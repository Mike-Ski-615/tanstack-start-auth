import { readdirSync, readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

/**
 * 每个 serverFn 都要声明自己的准入中间件。
 *
 * ## 为什么需要这条测试（类型系统只盖住一部分）
 *
 * 中间件方案把「忘了鉴权」从运行时问题变成了编译期问题 —— 但**只对读了
 * `context.user` 的 handler 成立**。事实上 admin.functions.ts 与
 * notifications.functions.ts 里有几个接口压根不读它：
 *
 *   listUsersByRoleFn         只按 data.role 查
 *   listSentNotificationsFn   参数都不用
 *   deleteNotificationBatchFn 只用 data.notificationId
 *   listSelectableUsersFn     参数都不用
 *
 * 这些接口漏挂 `.middleware([requireAdmin])` 会**照常编译通过**，而它们返回的
 * 是全部用户邮箱 / 已发通知 / 可选联系人 —— 等于把管理接口变成公开接口。
 *
 * 所以这条测试补的就是那一层：扫每个 `*.functions.ts`，每个 createServerFn
 * 必须在链上带准入中间件，且中间件必须在该文件允许的集合里。
 *
 * ## 它不能证明什么
 *
 * 它只证明「链上出现了允许的中间件」。它不检查这个角色选得对不对
 * （比如给用户侧接口挂 requireAdmin 会把用户挡在门外 —— 那种错误表现为
 * 测试大面积失败，不是静默漏洞）。
 */

/** 明确不需要准入的文件：这些接口本来就是给未登录用户用的。 */
const PUBLIC_FILES = new Set([
  "src/server/login.functions.ts",
  "src/server/register.functions.ts",
  "src/server/logout.functions.ts",
  "src/server/reset.functions.ts",
  "src/server/email-verification.functions.ts",
]);

/**
 * 每个受准入保护的文件 → 它的 handler 允许挂哪些中间件。
 *
 * 粒度到文件而不是到 handler：`admin.functions.ts` 里 6 个全是 admin 接口，
 * 而 `notifications.functions.ts` 是混合的（管理侧 requireAdmin、用户侧
 * requireUser），那里只能校验「挂了其中一个」。
 *
 * 新增文件时这张表必须同步 —— 见最后那条「没有漏掉文件」的断言。
 */
const ALLOWED: Record<string, readonly string[]> = {
  "src/server/admin.functions.ts": ["requireAdmin"],
  "src/server/notifications.functions.ts": ["requireAdmin", "requireUser"],
  "src/server/profile.functions.ts": ["requireUser", "withUser"],
  "src/server/sessions.functions.ts": ["requireUser", "withUser"],
  "src/server/user.functions.ts": ["withUser"],
};

/** 去掉注释后再查 —— 文档注释里会引用写法本身，不该被算作证据。 */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * 按 `export const` 切出每个 handler 的块。
 *
 * 第一段（文件头 + 未导出的辅助函数）丢掉：`requireManageableTarget` 之类
 * 就住在那里，它们不是 handler。由于切点是 `export const`，紧邻某个导出的
 * 文档注释会归到**前一块**，所以上面先去了注释。
 */
function handlerBlocks(src: string): string[] {
  return stripComments(src)
    .split(/^export const /m)
    .slice(1)
    .filter((b) => b.includes("createServerFn("));
}

describe("每个 serverFn 都声明了准入中间件", () => {
  it.each(Object.keys(ALLOWED))("%s", (file) => {
    const handlers = handlerBlocks(readFileSync(file, "utf8"));
    const expected = ALLOWED[file]!;

    // 防止切分规则随文件形态变化而空跑
    expect(handlers.length, `${file} 没切出任何 handler，切分规则可能失效`).toBeGreaterThan(0);

    for (const block of handlers) {
      const name = block.slice(0, block.indexOf(" "));
      const ok = expected.some((mw) => block.includes(`.middleware([${mw}])`));

      expect(ok, `${file} 的 ${name} 没挂 ${expected.join(" 或 ")} —— 这个接口是公开的`).toBe(true);
    }
  });

  it("没有漏掉应当被检查的文件", () => {
    // 新增带鉴权的 server 文件时，把它加进 ALLOWED；新增公开接口时加进
    // PUBLIC_FILES。这条断言的作用就是逼你做这个决定，而不是让新文件
    // 悄悄绕过上面那组检查。
    const protectedFiles = readdirSync("src/server")
      .filter((f) => f.endsWith(".functions.ts"))
      .map((f) => `src/server/${f}`)
      .filter((f) => !PUBLIC_FILES.has(f))
      .sort();

    expect(protectedFiles).toEqual(Object.keys(ALLOWED).sort());
  });
});
