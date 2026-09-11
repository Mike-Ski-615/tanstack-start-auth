import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * 路由状态页的结构契约。
 *
 * 两条硬约定（由仓库所有者指定）：
 *   1. **完全定制**：每个路由各有一份自己的 loading/error/not-found，
 *      不使用共享组件 —— 就算两页内容一样，也是两份独立文件。
 *   2. **目录与路由一一对应**：`src/components/status/` 的结构必须镜像
 *      `src/routes/` 的结构。
 *
 * 外加一条正确性约束（这些文件真正的技术风险）：
 *   3. **外壳感知**：`pendingComponent` 渲染时父路由的 component 仍在树上。
 *      所以只有整页路由（__root / index）能用 `min-h-svh`；
 *      嵌在 SidebarInset / Dialog / 已有 padding 的外壳里的，用它会
 *      顶出多余滚动条或撑破弹窗。
 *
 * 这三条都是"改错了不会报错、只在界面上表现为怪样子"的类型，
 * 所以必须拿测试钉住。
 */

const ROUTES = "src/routes";
const STATUS = "src/components/status";
const KINDS = ["loading", "error", "not-found"] as const;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** 路由 id（去扩展名，统一用 / 分隔以免平台差异）。 */
const routeIds = walk(ROUTES)
  .filter((f) => f.endsWith(".tsx"))
  .map((f) =>
    relative(ROUTES, f)
      .replace(/\.tsx$/, "")
      .replace(/\\/g, "/"),
  )
  .sort();

/**
 * 路由 id -> status 目录。
 *
 * 唯一的已知差异（有意为之）：路由层有 `authenticated/users/$userId`，
 * 但 status 侧去掉了多余的 `users/` 中间层 —— 它本身不是一个路由。
 */
function statusDirFor(routeId: string): string {
  return routeId.replace(/^authenticated\/users\//, "authenticated/");
}

/** 所有 status 子目录，统一用 / 分隔并把路径分隔符变换掉。
 *  排除 __tests__ 自身 —— 它是个目录但不是路由状态页。 */
const statusDirs = readdirSync(STATUS, { recursive: true, withFileTypes: false })
  .map((p) => String(p).replace(/\\/g, "/"))
  .filter(
    (p) =>
      !p.endsWith(".tsx") &&
      !p.startsWith("__tests__") &&
      existsSync(join(STATUS, p)) &&
      statSync(join(STATUS, p)).isDirectory(),
  )
  .sort();

describe("目录与路由一一对应", () => {
  it("每个路由都有自己的 status 目录", () => {
    for (const id of routeIds) {
      const dir = join(STATUS, statusDirFor(id));
      expect(existsSync(dir), `缺少 status 目录：${statusDirFor(id)}（路由 ${id}）`).toBe(true);
    }
  });

  it("每个 status 目录都有对应的路由", () => {
    const expected = new Set(routeIds.map(statusDirFor));
    for (const d of statusDirs) {
      expect(expected.has(d), `多余的 status 目录：${d}（没有对应路由）`).toBe(true);
    }
  });

  it("目录数量相等（除 status 根）", () => {
    expect(statusDirs.length).toBe(routeIds.length);
  });

  it("每个目录都有三件套，且没有多余文件", () => {
    for (const d of statusDirs) {
      const files = readdirSync(join(STATUS, d))
        .filter((f) => f.endsWith(".tsx"))
        .sort();
      expect(files, `${d} 的三件套不齐`).toEqual([...KINDS].sort().map((k) => `${k}.tsx`));
    }
  });
});

describe("每次都是独立实现，不共享组件", () => {
  it("status 内部互不 import（各写各的）", () => {
    for (const d of statusDirs) {
      for (const k of KINDS) {
        const src = readFileSync(join(STATUS, d, `${k}.tsx`), "utf8");
        const bad = /from\s+"#components\/status\/[^"]*(loading|error|not-found)"/.exec(src);
        expect(bad, `${d}/${k}.tsx 引用了别的状态页：${bad?.[0]}`).toBeNull();
      }
    }
  });

  it("同名导出：LoadingPage / ErrorPage / NotFoundPage", () => {
    for (const d of statusDirs) {
      expect(readFileSync(join(STATUS, d, "loading.tsx"), "utf8")).toMatch(
        /export function LoadingPage/,
      );
      expect(readFileSync(join(STATUS, d, "error.tsx"), "utf8")).toMatch(
        /export function ErrorPage/,
      );
      expect(readFileSync(join(STATUS, d, "not-found.tsx"), "utf8")).toMatch(
        /export function NotFoundPage/,
      );
    }
  });
});

describe("外壳感知：min-h-svh 只能出现在整页路由", () => {
  // 只有这两个挂在 __root 的 <Outlet /> 下，真的是一整屏。
  // auth/* 也不在其中：它们渲染在 auth.tsx 的 max-w-sm 居中容器内。
  const FULL_PAGE = new Set(["__root", "index"]);

  it("非整页路由绝不用 min-h-svh", () => {
    for (const d of statusDirs) {
      if (FULL_PAGE.has(d)) continue;
      for (const k of KINDS) {
        const src = readFileSync(join(STATUS, d, `${k}.tsx`), "utf8");
        // 注释里会提到 min-h-svh（解释为什么不用），所以只查 className 里的
        const inClass = /className="[^"]*min-h-svh/.test(src);
        expect(inClass, `${d}/${k}.tsx 用了 min-h-svh —— 它的外壳不是整页`).toBe(false);
      }
    }
  });

  it("整页路由（__root / index）确实用 min-h-svh", () => {
    for (const d of FULL_PAGE) {
      for (const k of KINDS) {
        const src = readFileSync(join(STATUS, d, `${k}.tsx`), "utf8");
        expect(src, `${d}/${k}.tsx 应整屏居中`).toMatch(/className="[^"]*min-h-svh/);
      }
    }
  });

  it("设置区（Dialog 内）用 h-full，不用整屏高度", () => {
    const settings = statusDirs.filter(
      (d) => d === "authenticated/settings" || d.startsWith("authenticated/settings/"),
    );
    expect(settings.length).toBeGreaterThan(0);
    for (const d of settings) {
      for (const k of KINDS) {
        const src = readFileSync(join(STATUS, d, `${k}.tsx`), "utf8");
        expect(src, `${d}/${k}.tsx 应在弹窗内自成高度`).toMatch(/min-h-full|h-full/);
      }
    }
  });
});

describe("退路不指死胡同", () => {
  it("authenticated 子树的状态页不把 `/` 当唯一退路", () => {
    // 这些页面在 beforeLoad 校验之后，指向 `/` 会被重定向回来。
    for (const d of statusDirs.filter((x) => x.startsWith("authenticated"))) {
      for (const k of ["error", "not-found"] as const) {
        const src = readFileSync(join(STATUS, d, `${k}.tsx`), "utf8");
        const onlyHome = /to="\/"/.test(src) && !/to=\{fallback\}|to="\/authenticated/.test(src);
        expect(onlyHome, `${d}/${k}.tsx 的退路只写了 "/"（会形成死循环）`).toBe(false);
      }
    }
  });

  it("用到 ROLE_HOME 的文件是按角色取落点，不是写死", () => {
    const withRole = statusDirs.filter((d) =>
      /ROLE_HOME/.test(readFileSync(join(STATUS, d, "error.tsx"), "utf8")),
    );
    expect(withRole.length, "应有若干状态页按角色给退路").toBeGreaterThan(0);
    for (const d of withRole) {
      const src = readFileSync(join(STATUS, d, "error.tsx"), "utf8");
      expect(src, `${d}/error.tsx 用了 ROLE_HOME 但没有兜底`).toMatch(
        /\?\s*ROLE_HOME\[|ROLE_HOME\[[^\]]+\]\s*:\s*"\//,
      );
    }
  });
});

describe("路由确实挂上了自己的三件套", () => {
  const routeFiles = walk(ROUTES).filter((f) => f.endsWith(".tsx"));

  it.each(routeFiles.map((f) => [relative(ROUTES, f).replace(/\\/g, "/"), f] as const))(
    "%s 的三处挂载都指向自身目录",
    (rel, file) => {
      const src = readFileSync(file, "utf8");
      const routeId = rel.replace(/\.tsx$/, "");
      const expected = statusDirFor(routeId);

      for (const k of KINDS) {
        const m = new RegExp(`from "#components/status/([^"]*)/${k}"`).exec(src);
        expect(m, `${rel} 没挂 ${k}`).not.toBeNull();
        expect(m![1], `${rel} 的 ${k} 指向了 ${m![1]}，应为 ${expected}`).toBe(expected);
      }
    },
  );
});
