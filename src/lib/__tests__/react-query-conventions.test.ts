import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ERROR_MESSAGE } from "#lib/error-messages";

/**
 * react-query 使用约定（对照 .agents/skills/react-query）。
 *
 * 这组测试钉住三条容易被改回去的约定：
 *
 *   1. 服务端抛的是**用户可读文案**，不是机器码。
 *   2. 客户端直接展示 error.message，**不做字符串匹配**。
 *   3. QueryClient 配了全局错误兜底。
 *
 * 它们都属于「改错了不报错、只表现为界面文案变怪或静默失败」的类型。
 */

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  // Windows 下 join 产出反斜杠，而下面的 startsWith("src/server/") 用正斜杠 ——
  // 不归一化的话筛选会静默命中 0 个文件，测试「全部通过」却什么都没检查。
  return out.map((p) => p.replace(/\\/g, "/"));
}

const sourceFiles = walk("src").filter((f) => !f.includes("__tests__"));
const read = (f: string) => readFileSync(f, "utf8");

describe("服务端抛出用户可读文案（不是机器码）", () => {
  const serverFiles = sourceFiles.filter(
    (f) => f.startsWith("src/server/") || f.startsWith("src/lib/"),
  );

  it("扫描范围非空（防止路径分隔符写错导致空跑）", () => {
    expect(serverFiles.length, "没扫到任何服务端文件").toBeGreaterThan(10);
  });

  it("没有服务端代码抛机器码风格的错误", () => {
    // 形如 throw new Error("forbidden") / ("no_recipients") / ("invalid_otp")
    const machineCode = /throw new Error\(\s*["'`][a-z][a-z0-9_]*["'`]\s*[,)]/;
    for (const f of serverFiles) {
      const m = machineCode.exec(read(f));
      expect(m, `${f} 抛了机器码错误码：${m?.[0]}`).toBeNull();
    }
  });

  it("没有裸的中文 throw（文案应来自 ERROR_MESSAGE）", () => {
    // 允许 throw new Error(ERROR_MESSAGE.X) / (OTP_REASON_MESSAGE[x]) / 带 cause 的
    for (const f of serverFiles) {
      const src = read(f);
      for (const m of src.matchAll(/throw new Error\(([^)]*)\)/g)) {
        const arg = m[1]!.trim();
        const ok =
          arg.startsWith("ERROR_MESSAGE.") ||
          arg.startsWith("OTP_REASON_MESSAGE[") ||
          arg.startsWith("FORBIDDEN") ||
          arg.startsWith("RATE_LIMITED") ||
          arg.startsWith("NOT_FOUND") ||
          arg.startsWith("CANNOT_TARGET_SELF") ||
          arg.startsWith("UNAUTHENTICATED") ||
          arg.includes("cause");
        expect(ok, `${f} 的 throw 参数应来自 ERROR_MESSAGE：${arg}`).toBe(true);
      }
    }
  });

  it("ERROR_MESSAGE 的每条都是可直接展示的句子（不含下划线机器码）", () => {
    for (const [key, text] of Object.entries(ERROR_MESSAGE)) {
      expect(text, `${key} 不该是机器码`).not.toMatch(/^[a-z][a-z0-9_]*$/);
      expect(text.length, `${key} 太短，不像句子`).toBeGreaterThan(3);
    }
  });
});

describe("客户端不做错误码字符串匹配", () => {
  /** 去掉注释后再查 —— 说明性注释里会引用旧写法作为反例。 */
  const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("没有任何 includes() 匹配错误码", () => {
    const patterns = [
      /\.message\.includes\(/,
      /includes\("forbidden"\)/,
      /includes\("not_found"\)/,
      /includes\("no_recipients"\)/,
      /includes\("invalid_otp"\)/,
      /includes\("rate_limited"\)/,
      /includes\("unauthorized"\)/,
    ];
    for (const f of sourceFiles) {
      const src = stripComments(read(f));
      for (const p of patterns) {
        const m = p.exec(src);
        expect(m, `${f} 仍在匹配错误码：${m?.[0]}`).toBeNull();
      }
    }
  });

  it("onError 展示的是 error.message，不是写死的通用文案", () => {
    // 允许：onError: (error: Error) => toast.error(error.message)
    // 不允许：onError: () => toast.error("操作失败，请稍后重试")
    const hardcoded = /onError:\s*\(\)\s*=>\s*toast\.error\(/;
    for (const f of sourceFiles) {
      const m = hardcoded.exec(stripComments(read(f)));
      expect(m, `${f} 丢弃了真实错误、改用固定文案`).toBeNull();
    }
  });
});

describe("QueryClient 有全局错误兜底", () => {
  const router = read("src/router.tsx");

  it("查询失败有 QueryCache.onError（v5 里查询只能挂这里）", () => {
    // react-query v5 已把 onError 从 defaultOptions.queries 移除，
    // 只保留在 QueryCache 上 —— 写错位置会静默失效
    expect(router).toMatch(/queryCache:\s*new QueryCache\(/);
    expect(router).toMatch(/onError:/);
  });

  it("变更失败有 defaultOptions.mutations.onError", () => {
    expect(router).toMatch(/defaultOptions:\s*\{[\s\S]*mutations:\s*\{[\s\S]*onError:/);
  });

  it("兜底展示 error.message", () => {
    expect(router).toMatch(/toast\.error\(error\.message\)/);
  });

  it("SSR 期间不弹提示", () => {
    expect(router).toMatch(/typeof window === "undefined"/);
  });
});

describe("查询错误的组件级兜底", () => {
  const boundary = read("src/components/query-error-boundary.tsx");
  const root = read("src/routes/__root.tsx");

  it("用了 QueryErrorResetBoundary（skill 的官方方案）", () => {
    expect(boundary).toMatch(/QueryErrorResetBoundary/);
  });

  it("重试会同时复位边界与查询（否则点重试没反应）", () => {
    expect(boundary).toMatch(/setState\(\{ error: null \}\)/);
    expect(boundary).toMatch(/onReset/);
  });

  it("挂在根布局上，能盖住所有页面", () => {
    expect(root).toMatch(/<QueryErrorBoundary>/);
  });
});

describe("页面的三态处理", () => {
  const pages = [
    "src/routes/authenticated/admin/students.tsx",
    "src/routes/authenticated/admin/teachers.tsx",
    "src/routes/authenticated/settings/account.tsx",
    "src/routes/authenticated/settings/bell.tsx",
    "src/routes/authenticated/settings/privacy-security.tsx",
  ];

  it.each(pages)("%s 同时处理了 pending 与 error", (f) => {
    const src = read(f);
    expect(src, `${f} 没处理加载态`).toMatch(/isPending/);
    expect(src, `${f} 没处理错误态`).toMatch(/\berror\b/);
  });

  it.each(pages)("%s 的 error 分支在渲染内容之前", (f) => {
    const src = read(f);
    const err = src.search(/if \(error\)|error \?/);
    const body = src.indexOf("return (");
    expect(err).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(-1);
    // error 判断必须在主 return 之前
    expect(err, `${f} 的 error 判断在主 return 之后`).toBeLessThan(body);
  });
});

describe("会话守卫覆盖查询失败（安全路径）", () => {
  const guard = read("src/hooks/use-session-guard.ts");

  it("error 时也跳登录页，不静默放行", () => {
    expect(guard).toMatch(/error/);
    expect(guard).toMatch(/if \(error\)[\s\S]{0,200}navigate\(\{ to: "\/auth\/login" \}\)/);
  });

  it("为此覆盖了查询定义里的 retry:false", () => {
    expect(guard).toMatch(/retry:\s*\d/);
    const spread = guard.indexOf("...currentUserQueryOptions");
    const retry = guard.indexOf("retry:");
    expect(retry).toBeGreaterThan(spread);
  });

  it("首次查询中不跳（还没结果就跳会误伤）", () => {
    expect(guard).not.toMatch(/data === undefined[\s\S]{0,120}navigate/);
  });
});
