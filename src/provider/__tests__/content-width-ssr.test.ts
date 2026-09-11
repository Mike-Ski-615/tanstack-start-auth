import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * 内容区宽度的首屏一致性。
 *
 * 背景：服务端拿不到 localStorage，只能按默认值渲染。若把纠正放在 useEffect，
 * 纠正发生在首帧绘制**之后** —— 用户会看到内容先铺满、再收窄，每次刷新都闪。
 *
 * 所以宽度改为：ScriptOnce 在绘制前把偏好写到 <html data-content-width>，
 * CSS 由该属性推出 max-width。这样 SSR 出的 HTML 与水合结果一致、无回流。
 *
 * 这组测试锁的就是「三方约定」：
 *   1. provider 真的注入了 ScriptOnce 脚本；
 *   2. 脚本写出的属性名与 CSS 选择器同名；
 *   3. CSS 里的三档数值与设置面板的三档语义对得上。
 * 任何一处改名，另一个地方就会静默失效（表现是「设置不管用了」），
 * 所以必须锁住。
 */
const provider = readFileSync("src/provider/content-width-provider.tsx", "utf8");
const css = readFileSync("src/styles/app.css", "utf8");

describe("宽度首屏：脚本 / 属性 / CSS 三方一致", () => {
  it("provider 注入了 ScriptOnce", () => {
    expect(provider).toMatch(/<ScriptOnce>\{getWidthScript\(\)\}<\/ScriptOnce>/);
    expect(provider).toMatch(/import \{ ScriptOnce \} from "@tanstack\/react-router"/);
  });

  it("脚本写的属性名与 CSS 选择器一致", () => {
    // 脚本侧
    expect(provider).toContain("setAttribute('data-content-width',w)");
    // CSS 侧必须监听同一个属性名，否则脚本白写
    expect(css).toContain('[data-content-width="wide"] .content-region');
    expect(css).toContain('[data-content-width="narrow"] .content-region');
  });

  it("三档取值与 ORDER 对齐", () => {
    // 脚本会用它校验 localStorage，写错档位名会导致每次都回落默认值
    expect(provider).toMatch(/ORDER: ContentWidth\[\] = \["narrow", "wide", "full"\]/);
    for (const v of ["narrow", "wide", "full"]) {
      expect(provider, `脚本没校验 ${v}`).toContain(v);
    }
  });

  it("CSS 数值与原来的 max-w-3xl / max-w-5xl 相同", () => {
    // Tailwind: max-w-3xl = 48rem, max-w-5xl = 64rem
    expect(css).toMatch(/\[data-content-width="narrow"\] \.content-region \{[^}]*max-width: 48rem/);
    expect(css).toMatch(/\[data-content-width="wide"\] \.content-region \{[^}]*max-width: 64rem/);
    // full 档不设 max-width（通栏）
    const fullBlock = /\[data-content-width="full"\][\s\S]{0,200}?\}/.exec(css);
    expect(fullBlock, "不该给 full 档写 max-width").toBeNull();
  });
});

describe("宽度不再靠 React 给类名（否则首屏必闪）", () => {
  const consumers = [
    "src/routes/authenticated/admin.tsx",
    "src/routes/authenticated/student.tsx",
    "src/routes/authenticated/teacher.tsx",
    "src/components/user/user-view.tsx",
  ];

  it("CONTENT_WIDTH_CLASS 是单个字符串，不是按档索引的 record", () => {
    expect(provider).toMatch(/CONTENT_WIDTH_CLASS = "content-region"/);
  });

  it.each(consumers)("%s 直接用 CONTENT_WIDTH_CLASS，不再索引 [width]", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src, `${file} 仍在按 width 索引`).not.toMatch(/CONTENT_WIDTH_CLASS\[/);
    expect(src, `${file} 没引用 CONTENT_WIDTH_CLASS`).toContain("CONTENT_WIDTH_CLASS");
  });

  it.each(consumers)("%s 不再依赖 useContentWidth 才能定宽", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src, `${file} 仍读 context`).not.toMatch(/useContentWidth\(\)/);
  });
});

describe("侧栏手柄留白：与 SidebarTrigger 同档", () => {
  const trigger = readFileSync("src/components/sidebar-trigger.tsx", "utf8");

  it("手柄是 lg 以上才出现", () => {
    expect(trigger).toContain("lg:flex");
    expect(trigger).not.toContain("md:flex");
  });

  it("留白也用 lg 档（早先误写成 md，md–lg 白留 28px）", () => {
    expect(provider).toMatch(/SIDEBAR_GUTTER_CLASS = "lg:ps-7"/);
    expect(provider).not.toMatch(/SIDEBAR_GUTTER_CLASS = "md:/);
  });

  it("四个内容容器都让开了手柄", () => {
    for (const f of [
      "src/routes/authenticated/admin.tsx",
      "src/routes/authenticated/student.tsx",
      "src/routes/authenticated/teacher.tsx",
    ]) {
      expect(readFileSync(f, "utf8"), `${f} 缺少 SIDEBAR_GUTTER_CLASS`).toContain(
        "SIDEBAR_GUTTER_CLASS",
      );
    }
    // user-view 自己有 lg:p-8（32px ≥ 28px），已盖过手柄，无需再加
    expect(readFileSync("src/components/user/user-view.tsx", "utf8")).toContain("lg:p-8");
  });
});
