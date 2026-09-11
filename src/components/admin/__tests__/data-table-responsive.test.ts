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
  const code = stripComments(readFileSync(file, "utf8"));

  it("声明了 @container（否则 @2xl 之类的容器断点不生效）", () => {
    expect(code, `${file} 缺少 @container`).toMatch(/@container/);
  });

  it("不用视口断点做布局（lg: / md: / sm: 会跟着视口走，与容器无关）", () => {
    // 只查布局类前缀，且用 (?<!@) 让开 @2xl: 这种容器断点形式
    const viewportBreakpoint = /(?<!@)\b(sm|md|lg|xl|2xl):[a-z-]/;
    const m = viewportBreakpoint.exec(code);
    expect(m, `${file} 用了视口断点 ${m?.[0]}，应改为容器断点（如 @2xl:）`).toBeNull();
  });
});

describe("分页组件：窄容器分两行", () => {
  const src = readFileSync("src/components/admin/data-table-pagination.tsx", "utf8");
  const code = stripComments(src);

  it("窄时纵向堆叠", () => {
    expect(code).toMatch(/flex-col/);
  });

  it("宽时回到一行（横向安排）", () => {
    expect(code).toMatch(/@2xl:flex-row/);
  });

  it("首/末页按钮在窄容器隐藏，宽容器恢复", () => {
    // 隐藏与恢复必须成对，否则要么小屏挤、要么大屏少按钮
    expect(code).toMatch(/hidden size-8 @2xl:flex/);
  });

  it("页码文案不设固定宽度（固定宽度会在「第 10 / 10 页」时截断）", () => {
    expect(code, "页码容器不该有 w-25 之类的固定宽度").not.toMatch(/\bw-\d+\b[^"]*text-sm/);
    expect(code).toMatch(/whitespace-nowrap/);
  });
});
