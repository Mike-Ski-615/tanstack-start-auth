import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ERROR_MESSAGE } from "#lib/error-messages";

/**
 * react-query 使用约定（对照 .agents/skills/tanstack-query）。
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

/** 去掉注释后再查 —— 说明性注释里会引用旧写法作为反例，不该被算作违规。 */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

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

describe("defaultOptions.queries 显式声明了默认值", () => {
  // 必须先剥注释：说明性注释里会引用 `gcTime: ...` / `retry: ...` 等
  // 作为例子，不剥的话下面的断言会被注释满足，测试形同虚设。
  const router = stripComments(read("src/router.tsx"));

  /*
   * 不配 queries 时会落到库默认，而库默认里有一条很隐形的：
   *     const retry = config.retry ?? (isServer() ? 0 : 3);
   * 即浏览器端默认重试 3 次 + 指数退避，一次失败最长约 7 秒才报错。
   * 不翻库源码看不出来 —— 所以这里钉住「必须显式写明」。
   */
  it("显式写了 retry（不依赖库默认的 3 次）", () => {
    expect(router).toMatch(/defaultOptions:\s*\{[\s\S]*queries:\s*\{[\s\S]*retry:/);
  });

  it("显式写了 staleTime（库默认是 0，即每次挂载都重取）", () => {
    expect(router).toMatch(/defaultOptions:\s*\{[\s\S]*queries:\s*\{[\s\S]*staleTime:/);
  });

  it("显式写了 gcTime（库默认浏览器端只有 5 分钟）", () => {
    expect(router).toMatch(/defaultOptions:\s*\{[\s\S]*queries:\s*\{[\s\S]*gcTime:/);
  });

  it("库的隐式默认 gcTime 确实是 5 分钟（注释引用的依据仍成立）", () => {
    const removable = readFileSync(
      "node_modules/@tanstack/query-core/build/modern/removable.js",
      "utf8",
    );
    // newGcTime ?? (isServer() ? Infinity : 3e5)   ← 3e5 = 5 分钟
    expect(removable, "库默认变了，router.tsx 的注释需要同步").toMatch(
      /newGcTime \?\? \(isServer\(\) \? Infinity : 3e5\)/,
    );
  });

  it("库的隐式默认确实是 3 次重试（注释里引用的依据仍成立）", () => {
    const retryer = readFileSync(
      "node_modules/@tanstack/query-core/build/modern/retryer.js",
      "utf8",
    );
    expect(retryer, "库默认变了，router.tsx 的注释需要同步").toMatch(
      /config\.retry \?\? \(isServer\(\) \? 0 : 3\)/,
    );
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
    "src/routes/authenticated/admin/notifications.tsx",
    "src/routes/authenticated/settings/account.tsx",
    "src/routes/authenticated/settings/bell.tsx",
    "src/routes/authenticated/settings/privacy-security.tsx",
  ];

  /**
   * 非路由组件（列表）也要三态齐全。
   *
   * 它们没有路由级 errorComponent 可依赖，所以错误分支必须就地写。
   * 原先这些地方只有 isLoading + 「空」两支 —— 请求失败会被误算成「空」，
   * 渲染成「还没有收到过通知」这类文案，用户分不清是没数据还是没取到。
   */
  const listComponents = [
    "src/components/admin/sent-notifications.tsx",
    "src/components/notification/notification-history.tsx",
    "src/components/header/header-bell.tsx",
  ];

  it.each(listComponents)("%s 列表三态齐全", (f) => {
    const src = stripComments(read(f));
    expect(src, `${f} 没处理加载态`).toMatch(/isPending/);
    expect(src, `${f} 没处理错误态`).toMatch(/\berror\b/);
    // 错误文案直接展示 message，不再给一个笼统的固定句
    expect(src, `${f} 应展示 error.message`).toMatch(/error\.message/);
  });

  it.each(listComponents)("%s 的三态同形（都是居中 + 图标 + 文字）", (f) => {
    const src = stripComments(read(f));
    // 加载中 = 转圈图标；失败 = 告警图标；两者都应出现
    expect(src, `${f} 缺少加载图标`).toMatch(/Loading02Icon/);
    expect(src, `${f} 缺少失败图标`).toMatch(/Alert01Icon/);
    // 形状：flex flex-col items-center gap-2
    expect(src, `${f} 三态未共用居中排版`).toMatch(/flex flex-col items-center gap-2/);
  });

  it("这几个列表不再用 isLoading（改用 isPending，避免「有数据但刷新中」也闪加载）", () => {
    for (const f of listComponents) {
      const src = stripComments(read(f));
      expect(src, `${f} 仍在用 isLoading`).not.toMatch(/\bisLoading\b/);
    }
  });

  it.each(pages)("%s 同时处理了 pending 与 error", (f) => {
    const src = stripComments(read(f));
    expect(src, `${f} 没处理加载态`).toMatch(/isPending/);
    expect(src, `${f} 没处理错误态`).toMatch(/\berror\b/);
  });

  it.each(pages)("%s 的 error 分支在渲染内容之前", (f) => {
    const src = stripComments(read(f));
    // 允许 `if (error)`、`if (isPending || error)`、`error ?` 三种写法
    const err = src.search(/if \([^)]*\berror\b[^)]*\)|error \?/);
    // 主 return：缩进为两空格的 return（排除早返回里那个四空格的）
    const body = src.search(/\n  return \(/);
    expect(err, `${f} 没找到 error 分支`).toBeGreaterThan(-1);
    expect(body, `${f} 没找到主 return`).toBeGreaterThan(-1);
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

describe("查询定义集中在 lib/queries（key 与 fn 绑定）", () => {
  /*
   * A 方案：queryOptions() 把 key、fn、类型绑在一个模块里，消费方 import 它。
   * 于是「散在各处写字符串 key」的风险被结构性消除 —— key 只能出现在
   * lib/queries 下，别处裸写 key 数组就是违规。
   */
  it("没有裸写的 queryKey 数组（lib/queries 之外）", () => {
    const bare = /queryKey:\s*\[/;
    for (const f of sourceFiles) {
      if (f.startsWith("src/lib/queries/")) continue;
      const m = bare.exec(stripComments(read(f)));
      expect(m, `${f} 裸写了 queryKey，应改用 lib/queries 的查询模块`).toBeNull();
    }
  });

  it("特有的 key 字符串只出现在 lib/queries（消费方不得重写）", () => {
    const keys = [
      "current-user",
      "security-info",
      "admin-users",
      "sent-notifications",
      "selectable-users",
    ];
    for (const f of sourceFiles) {
      if (f.startsWith("src/lib/queries/")) continue;
      const src = read(f);
      for (const k of keys) {
        expect(src.includes(`"${k}"`), `${f} 重写了 key 字符串 "${k}"`).toBe(false);
      }
    }
  });

  it("每个查询模块都绑定了 queryKey 与 queryFn", () => {
    for (const f of [
      "src/lib/queries/user.ts",
      "src/lib/queries/sessions.ts",
      "src/lib/queries/admin.ts",
      "src/lib/queries/notifications.ts",
    ]) {
      const src = read(f);
      expect(src, `${f} 应定义 queryKey`).toMatch(/queryKey:/);
      expect(src, `${f} 应定义 queryFn`).toMatch(/queryFn:/);
    }
  });

  it("消费方统一走查询模块（不再内联 queryOptions）", () => {
    const consumers: Record<string, string> = {
      "src/routes/auth.tsx": "currentUserQueryOptions",
      "src/routes/authenticated.tsx": "currentUserQueryOptions",
      "src/routes/authenticated/settings/bell.tsx": "currentUserQueryOptions",
      "src/hooks/use-session-guard.ts": "currentUserQueryOptions",
      "src/hooks/use-auth-mutations.ts": "currentUserQueryOptions",
      "src/hooks/use-notifications.ts": "currentUserQueryOptions",
      "src/routes/authenticated/settings/profile.tsx": "currentUserQueryOptions",
      "src/routes/authenticated/settings/account.tsx": "securityInfoQueryOptions",
      "src/routes/authenticated/settings/privacy-security.tsx": "securityInfoQueryOptions",
      "src/routes/authenticated/users/$userId.tsx": "userByIdQueryOptions",
      "src/routes/authenticated/admin/students.tsx": "adminUsersQueryOptions",
      "src/routes/authenticated/admin/teachers.tsx": "adminUsersQueryOptions",
    };
    for (const [f, name] of Object.entries(consumers)) {
      expect(read(f), `${f} 没走 ${name}`).toMatch(new RegExp(name));
    }
  });
});

describe("注册接口不泄漏账号是否存在（防枚举）", () => {
  const src = read("src/server/register.functions.ts");

  it("邮箱已存在时不抛错", () => {
    // 若这里 throw，等于给攻击者一个免费的账号枚举接口
    const existingBlock = /if \(existingUser\) \{([\s\S]*?)\n    \}/.exec(src);
    expect(existingBlock, "没找到 existingUser 分支").not.toBeNull();
    expect(existingBlock![1], "邮箱已存在时不应 throw").not.toMatch(/throw/);
  });

  it("邮箱已存在时仍返回 success: true", () => {
    const existingBlock = /if \(existingUser\) \{([\s\S]*?)\n    \}/.exec(src);
    expect(existingBlock![1]).toMatch(/success: true/);
  });

  it("但会给邮箱持有者发提醒邮件（否则真忘密码的用户会卡死）", () => {
    const existingBlock = /if \(existingUser\) \{([\s\S]*?)\n    \}/.exec(src);
    expect(existingBlock![1]).toMatch(/sendMail\(/);
    expect(existingBlock![1]).toMatch(/已注册过/);
  });

  it("与既有实现一致：忘记密码接口也是恒返回同响应", () => {
    // 项目里原本就有正确的防枚举范式，注册现在与它对齐
    const reset = read("src/server/reset.functions.ts");
    expect(reset).toMatch(/无论邮箱是否存在，恒返回同一响应/);
  });
});
