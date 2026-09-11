import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * header 的响应式契约。
 *
 * 这里读**真实源码**断言，而不是渲染组件：header 的退化全靠 Tailwind 类，
 * 渲染出来在 node 环境下也算不出实际宽度。要保住的是两条规则：
 *
 *   1. 搜索是主操作 —— 任何宽度下都在，只退化形态（图标 → 文字 → 文字 + 键位提示）；
 *   2. 任何被隐藏的控件，它挨着的那条分隔线必须一起隐藏，
 *      否则会留下一条悬空竖线。
 *
 * 第 2 条是最容易在后续改动里被漏掉的，所以单独锁一条。
 */
const read = (p: string) => readFileSync(p, "utf8");

const header = read("src/components/header/index.tsx");
const palette = read("src/components/header/command-palette.tsx");
const breadcrumb = read("src/components/header/header-breadcrumb.tsx");
const widthToggle = read("src/components/header/content-width-toggle.tsx");

describe("header 响应式：搜索按钮的三档退化", () => {
  it("窄屏收成图标但**仍然渲染**（不能被 hidden 掉）", () => {
    // 取 <Button ...> 开头到 className 结束的那段，抽出其中的字符串字面量。
    const start = palette.indexOf('aria-label="搜索"');
    expect(start, "没找到搜索按钮").toBeGreaterThan(-1);
    const slice = palette.slice(start, palette.indexOf("onClick", start));
    const literals = [...slice.matchAll(/"([^"\n]*)"/g)].map((m) => m[1]!);

    // 每个 hidden 必须紧跟一个能把它恢复回来的档位（sm:/lg:/…）。
    // 裸 hidden 就意味着按钮在某个宽度下彻底消失 —— 那是违约。
    const offending = literals.filter(
      (c) => /(^|\s)hidden(\s|$)/.test(c) && !/(sm|md|lg|xl|2xl):/.test(c),
    );
    expect(offending, `搜索按钮上有裸 hidden: ${JSON.stringify(offending)}`).toEqual([]);
  });

  it("有可访问名 —— 窄屏只剩图标时屏幕阅读器仍知道这是搜索", () => {
    expect(palette).toContain('aria-label="搜索"');
  });

  it("三档文案：sm 起「搜索...」，lg 起「搜索文档...」", () => {
    expect(palette).toMatch(/hidden truncate sm:inline lg:hidden">搜索\.\.\./);
    expect(palette).toMatch(/hidden truncate lg:inline">搜索文档\.\.\./);
  });

  it("键位提示比最宽文案更晚出现（xl）", () => {
    expect(palette).toMatch(/KbdGroup className="ml-auto hidden shrink-0 xl:flex"/);
  });

  it("图标态（<sm）走 ghost，带文字态（>=sm）走 secondary", () => {
    // variant 是单个 prop、无法用类切，所以这里用 JS 表达式；
    // 关键是两条：(1) 确实是表达式而不是写死；(2) 判断断点与文字 span 同档。
    expect(palette).toMatch(/variant=\{isCompact \? "ghost" : "secondary"\}/);
    expect(palette).toMatch(/useIsBelow\("sm"\)/);

    // 文字 span 的出现档位也是 sm —— 两处必须同档，否则会出现
    // 「有底色但没文字」或「有文字却没底色」。
    expect(palette).toMatch(/hidden truncate sm:inline lg:hidden">搜索\.\.\./);
  });

  it("不再用 bg-* 类覆盖 variant（已改为表达式）", () => {
    expect(palette).not.toContain("bg-transparent");
    expect(palette).not.toContain("sm:bg-secondary");
  });
});

describe("header 响应式：控件隐藏时分隔线同生共死", () => {
  it("内容宽度按钮 sm 以下隐藏，它前面那条分隔线也是 sm 以下隐藏", () => {
    // 按钮
    expect(header).toMatch(/<ContentWidthToggle className="hidden sm:inline-flex" \/>/);
    // 紧邻的分隔线带同档 hidden sm:block
    expect(header).toMatch(/className="my-auto hidden data-\[orientation=vertical\]:h-4 sm:block"/);
  });

  it("内容宽度按钮在窄屏不参与布局（占位为 0）", () => {
    expect(widthToggle).toMatch(/export function ContentWidthToggle\(\{ className \}/);
    expect(widthToggle).toContain("className={cn(className)}");
  });

  it("面包屑窄屏整体收起，避免顶走能点的控件", () => {
    expect(breadcrumb).toMatch(/<Breadcrumb className="hidden min-w-0 sm:block">/);
    // 且不换行 —— 换行会把 header 撑高
    expect(breadcrumb).toContain("flex-nowrap");
  });

  it("分隔线数量与控件一一对应（不多也不少）", () => {
    const separators = header.match(/<Separator/g) ?? [];
    // panel 后那条 + 搜索/通知之间那条 + 宽度前那条（条件显示）+ 主题前那条
    expect(separators.length).toBe(4);
  });
});

describe("header 响应式：各档宽度放得下", () => {
  // 与源码里的类一一对应；数字是控件实测尺寸的保守估计。
  const GAP = 8;
  const PAD = 16;
  const ICON = 32;
  const SEP = 1;

  const bands: Record<string, { vp: number; parts: number[] }> = {
    xl: { vp: 1280, parts: [ICON, SEP, 92, 220, SEP, ICON, SEP, ICON, SEP, ICON] },
    lg: { vp: 1024, parts: [ICON, SEP, 92, 150, SEP, ICON, SEP, ICON, SEP, ICON] },
    sm: { vp: 640, parts: [ICON, SEP, 56, 96, SEP, ICON, SEP, ICON, SEP, ICON] },
    xs: { vp: 320, parts: [ICON, SEP, 0, 36, SEP, ICON, 0, 0, SEP, ICON] },
  };

  for (const [band, { vp, parts }] of Object.entries(bands)) {
    it(`${band} 在最小视口 ${vp}px 下不溢出`, () => {
      const total = PAD + parts.reduce((a, b) => a + b, 0) + (parts.length - 1) * GAP;
      expect(total).toBeLessThanOrEqual(vp);
    });
  }
});
