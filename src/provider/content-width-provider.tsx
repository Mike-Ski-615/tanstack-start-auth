import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ScriptOnce } from "@tanstack/react-router";

/**
 * 内容区宽度偏好。
 *
 * 三个工作台布局（student / teacher / admin）用它包住自己的内容，
 * header 上的按钮切换它。存 localStorage —— 刷新后保持。
 *
 * ### 为什么宽度不直接用类名，而要走 data 属性 + CSS
 *
 * 服务端拿不到 localStorage，只能按默认值渲染 HTML。若在 useEffect 里纠正，
 * 纠正发生在**首帧绘制之后** —— 用户会看到内容先按「通栏」铺满、再啪地
 * 收窄，是真实的回流（且每次刷新都来一次）。
 *
 * 所以跟 theme-provider 一个路子：用 ScriptOnce 在**绘制前**把偏好写到
 * <html> 上（此脚本位于 <body> 开头，那时 <div class="content-region"> 还
 * 没解析出来，改不到它 —— 能立即改到的只有 <html>）。宽度则由 CSS 从
 * <html> 的 data-content-width 推出来，于是首屏 HTML 与水合结果天然一致，
 * 没有回流、也没有 hydration mismatch。
 */

export type ContentWidth = "full" | "wide" | "narrow";

/**
 * 宽度容器类。**只有这一处**需要它 —— 具体的 max-width 由 app.css 根据
 * <html data-content-width> 决定（见那里的 .content-region）。
 */
export const CONTENT_WIDTH_CLASS = "content-region";

/**
 * 让开侧栏拖拽手柄的左侧内边距。
 *
 * SidebarTrigger 是 `absolute left-2 w-2.5` + `hidden lg:flex` —— 占 x=8..18px，
 * 且只在 lg 以上存在。所以：
 *   - 用 ps-7（=28px）而不是 ps-6：28px 盖住 18px 还剩 10px 间隙，
 *     手柄贴着正文会显得很赃，也容易误触。
 *   - 断点必须是 lg，跟 trigger 的 `lg:flex` 同档。早先写成 md，
 *     结果 md–lg 这一段白白多出 28px 留白，而那里根本没有手柄。
 *
 * 用 ps-（逻辑属性）而非 pl-：RTL 下要镜像到右侧。
 */
export const SIDEBAR_GUTTER_CLASS = "lg:ps-7";

export const CONTENT_WIDTH_LABEL: Record<ContentWidth, string> = {
  full: "通栏",
  wide: "宽",
  narrow: "窄",
};

const ORDER: ContentWidth[] = ["narrow", "wide", "full"];

const STORAGE_KEY = "content-width";
const DEFAULT_WIDTH: ContentWidth = "full";

/** 在绘制前把偏好写到 <html>，供 CSS 使用。与 theme-provider 同一路子。 */
function getWidthScript() {
  const key = JSON.stringify(STORAGE_KEY);
  const fallback = JSON.stringify(DEFAULT_WIDTH);
  const valid = JSON.stringify(ORDER);

  return `(function(){var w;try{w=localStorage.getItem(${key})}catch(e){}if(${valid}.indexOf(w)<0){w=${fallback}}document.documentElement.setAttribute('data-content-width',w)})();`;
}

/** 把偏好同步到 <html>（切换、水合后都要保持）。 */
function applyWidth(w: ContentWidth) {
  document.documentElement.setAttribute("data-content-width", w);
}

type ContentWidthState = {
  width: ContentWidth;
  setWidth: (w: ContentWidth) => void;
  /** 在 narrow → wide → full 之间循环。 */
  cycle: () => void;
};

const ContentWidthContext = createContext<ContentWidthState>({
  width: DEFAULT_WIDTH,
  setWidth: () => {},
  cycle: () => {},
});

function isWidth(v: unknown): v is ContentWidth {
  return v === "full" || v === "wide" || v === "narrow";
}

export function ContentWidthProvider({ children }: { children: React.ReactNode }) {
  const [width, setWidthState] = useState<ContentWidth>(DEFAULT_WIDTH);

  /**
   * 水合后采纳 ScriptOnce 已写在 <html> 上的值。
   *
   * 不能直接置为 DEFAULT_WIDTH：脚本已经把真实偏好写上去了（绘制前），
   * 若这里再置回默认，就会把刚做好的首屏又改一遍 —— 等于白做。
   * 读属性而不再读 localStorage，是为了跟脚本用**同一个来源**，避免两边
   * 判断不一致（例如 localStorage 被改坏时脚本用了 fallback）。
   */
  useEffect(() => {
    const current = document.documentElement.getAttribute("data-content-width");
    if (isWidth(current)) setWidthState(current);
    else applyWidth(DEFAULT_WIDTH);
  }, []);

  const setWidth = useCallback((w: ContentWidth) => {
    setWidthState(w);
    applyWidth(w);
    try {
      localStorage.setItem(STORAGE_KEY, w);
    } catch {
      // 隐私模式等场景下 localStorage 不可用 —— 内存里仍然生效
    }
  }, []);

  const cycle = useCallback(() => {
    setWidthState((prev) => {
      const next = ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]!;
      applyWidth(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 同上
      }
      return next;
    });
  }, []);

  return (
    <ContentWidthContext.Provider value={{ width, setWidth, cycle }}>
      <ScriptOnce>{getWidthScript()}</ScriptOnce>
      {children}
    </ContentWidthContext.Provider>
  );
}

export function useContentWidth() {
  return useContext(ContentWidthContext);
}
