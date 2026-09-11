import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * 表格组件的断点必须看**容器**，不是视口。
 *
 * ## 为什么
 *
 * 表格所在的内容区宽度由 `ContentWidthToggle` 控制（narrow / wide / full），
 * 而视口宽度并不能代表它 —— 例如视口 1280px 时，narrow 档下表格容器
 * 只有约 768px。
 *
 * 所以这里用视口断点（`lg:`）会造成：视口明明够宽、容器却很窄，
 * 于是布局提前并排、内容挤成一团。反过来的情况同样错。
 *
 * `data-table-toolbar.tsx` 的注释里记着这条教训，本文件把它钉成测试 ——
 * 断点写错不会报错，只会在某个宽度档下看起来怪，很难靠读代码发现。
 */
const FILES = [
  "src/components/admin/data-table-pagination.tsx",
  "src/components/admin/data-table-toolbar.tsx",
];

/** 去掉注释，避免说明性文字里提到 "lg:" 被判为违规。 */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe.each(FILES)("%s", (file) => {
  const raw = readFileSync(file, "utf8");
  const code = stripComments(raw);

  it("声明了 @container（否则 @3xl 之类的容器断点不生效）", () => {
    expect(code, `${file} 缺少 @container`).toMatch(/@container/);
  });

  /*
   * CSS 规定**元素不能查询自己的容器**：`@3xl:` 只会去找最近的祖先容器。
   *
   * 所以 `@container` 与 `@3xl:` **不能写在同一个 class 属性上** ——
   * 那样查询会落到外层容器（或根本没有，永不生效），表现为“不管容器
   * 多宽都不切布局”。这个错很難靠读代码发现，所以钉成测试。
   */
  it("@container 与容器断点不在同一个元素上", () => {
    for (const m of code.matchAll(/className="([^"]*)"/g)) {
      const cls = m[1];
      const hasContainer = cls.includes("@container");
      // 容器断点：@ 开头且带冒号（如 @3xl:flex-row），排除 @container 本身
      const hasBreakpoint = /@\w+:/.test(cls);
      if (hasContainer && hasBreakpoint) {
        throw new Error(
          `${file} 的同一元素同时有 @container 与容器断点，\n` +
            `元素无法查询自己，断点会永不生效：\n  ${cls}`,
        );
      }
    }
  });

  it("不用视口断点做布局（lg: / md: / sm: 会跟着视口走，与容器无关）", () => {
    // 只查布局类前缀，且用 (?<!@) 让开 @3xl: 这种容器断点形式
    const viewportBreakpoint = /(?<!@)\b(sm|md|lg|xl|2xl):[a-z-]/;
    const m = viewportBreakpoint.exec(code);
    expect(m, `${file} 用了视口断点 ${m?.[0]}，应改为容器断点（如 @3xl:）`).toBeNull();
  });
});

describe("分页组件：小于 md 分两行", () => {
  const src = readFileSync("src/components/admin/data-table-pagination.tsx", "utf8");
  const code = stripComments(src);

  it("小于 md 时纵向堆叠", () => {
    expect(code).toMatch(/flex-col/);
  });

  it("md 以上回到一行（横向安排）", () => {
    // @3xl = 48rem = 768px，与 Tailwind 的 md 同值
    expect(code).toMatch(/@3xl:flex-row/);
  });

  it("@3xl 与 md 确实是同一个阈值（意图是「小于 md 分两行」）", () => {
    /*
     * 这条断的是「用 @3xl 能实现小于 md 分两行」这个前提。
     * Tailwind 升级改了容器刻度或断点刻度时，两者会错开 —— 那时这里失败，
     * 提示去改用与 md 等值的那一档。
     */
    const theme = readFileSync("node_modules/tailwindcss/theme.css", "utf8");
    const md = /--breakpoint-md:\s*([\d.]+)rem/.exec(theme)?.[1];
    const c3xl = /--container-3xl:\s*([\d.]+)rem/.exec(theme)?.[1];
    expect(md, "没找到 --breakpoint-md").toBeDefined();
    expect(c3xl, "没找到 --container-3xl").toBeDefined();
    expect(c3xl, "@3xl 与 md 不再同值，需改用等值的那一容器档").toBe(md);
  });

  it("首/末页按钮在小于 md 时隐藏，md 以上恢复", () => {
    // 隐藏与恢复必须成对，否则要么小屏挤、要么大屏少按钮
    expect(code).toMatch(/hidden size-8 @3xl:flex/);
  });

  it("页码文案不设固定宽度（固定宽度会在「第 10 / 10 页」时截断）", () => {
    expect(code, "页码容器不该有 w-25 之类的固定宽度").not.toMatch(/\bw-\d+\b[^"]*text-sm/);
    expect(code).toMatch(/whitespace-nowrap/);
  });
});
