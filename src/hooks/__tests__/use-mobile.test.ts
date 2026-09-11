import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { BREAKPOINTS } from "#hooks/use-mobile";

/**
 * JS 里的断点数字必须与 Tailwind 的刻度一致。
 *
 * 这是 use-mobile 抽出来的**唯一理由**：CSS 写 `lg:block`、JS 写
 * `useIsBelow("lg")`，两边若各维护一份数字，迟早会悄悄错开 ——
 * 而错开的症状是「某个宽度区间控件消失/失效」，很难一眼看出根因。
 *
 * 所以这里直接读 Tailwind 的 theme.css 对账，而不是把数字再抄一遍
 * （抄一遍就成了第三个真源，等于没解决问题）。
 */
const themeCss = readFileSync("node_modules/tailwindcss/theme.css", "utf8");

function tailwindBreakpoints(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of themeCss.matchAll(/--breakpoint-([\w-]+):\s*([\d.]+)rem/g)) {
    out[m[1]!] = Number(m[2]) * 16; // rem -> px（浏览器默认 16px 根字号）
  }
  return out;
}

describe("use-mobile 的断点与 Tailwind 对齐", () => {
  it("逐档与 theme.css 的 --breakpoint-* 相等", () => {
    const tw = tailwindBreakpoints();
    expect(Object.keys(tw).length, "没解析到 Tailwind 断点").toBeGreaterThan(0);

    for (const [name, px] of Object.entries(BREAKPOINTS)) {
      expect(tw[name], `Tailwind 缺少 ${name} 档`).toBeDefined();
      expect(px, `${name} 对不上：JS=${px} CSS=${tw[name]}`).toBe(tw[name]);
    }
  });

  it("只声明 Tailwind 真的有的档位（不臆造 xs/3xl）", () => {
    const tw = tailwindBreakpoints();
    for (const name of Object.keys(BREAKPOINTS)) {
      expect(tw, `JS 声明了 Tailwind 没有的档位 ${name}`).toHaveProperty(name);
    }
  });

  it("useIsBelow 的语义与 min-width 相反：以下 = 该档样式还没生效", () => {
    // 断点定义成「min-width」，所以「以下」的判定边界是 min - 1。
    // 用 lg 对一遍：1024 起 lg: 生效，所以 1023 及以下算「窄屏」。
    const lg = BREAKPOINTS.lg;
    const below = (w: number) => w < lg;

    expect(below(lg - 1)).toBe(true);
    expect(below(lg)).toBe(false);
  });
});

describe("侧栏断点契约：桌面侧栏与 Sheet 必须同档", () => {
  const sidebar = readFileSync("src/components/ui/sidebar.tsx", "utf8");
  const trigger = readFileSync("src/components/sidebar-trigger.tsx", "utf8");
  const panelBtn = readFileSync("src/components/header/panel-left-open.tsx", "utf8");
  const header = readFileSync("src/components/header/index.tsx", "utf8");

  it("useIsMobile 用的是 lg（与下面这些 CSS 类同档）", () => {
    const hook = readFileSync("src/hooks/use-mobile.ts", "utf8");
    expect(hook).toMatch(/useIsBelow\("lg"\)/);
  });

  it("桌面侧栏 md:block -> lg:block", () => {
    expect(sidebar).toContain("lg:block");
    expect(sidebar).not.toMatch(/hidden shrink-0[^"]*md:block/);
  });

  it("调整手柄与收起按钮同在 lg 档", () => {
    expect(trigger).toContain("lg:flex");
    expect(panelBtn).toContain("lg:hidden");
    expect(panelBtn).toContain("lg:flex");
  });

  it("header 给桌面侧栏让的左边距也在 lg 档", () => {
    expect(header).toContain("lg:ps-4");
  });
});
