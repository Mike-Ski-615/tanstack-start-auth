import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * 内容区宽度偏好。
 *
 * 三个工作台布局（student / teacher / admin）用它包住自己的内容，
 * header 上的按钮切换它。存 localStorage —— 刷新后保持。
 *
 * 为什么不用 theme-provider 那种 ScriptOnce 首屏注入：
 * 宽度不对只是「闪一下」，不像主题会闪白/黑屏，多一个内联脚本不值。
 * 代价是首帧用默认值，挂载后立刻纠正。
 */

export type ContentWidth = "full" | "wide" | "narrow";

/** 三档宽度。值是 Tailwind 类，布局直接用。 */
export const CONTENT_WIDTH_CLASS: Record<ContentWidth, string> = {
  full: "w-full",
  wide: "mx-auto w-full max-w-5xl",
  narrow: "mx-auto w-full max-w-3xl",
};

export const CONTENT_WIDTH_LABEL: Record<ContentWidth, string> = {
  full: "通栏",
  wide: "宽",
  narrow: "窄",
};

const ORDER: ContentWidth[] = ["narrow", "wide", "full"];

const STORAGE_KEY = "content-width";
const DEFAULT_WIDTH: ContentWidth = "full";

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

  // 挂载后读存储。服务端渲染时拿不到 localStorage，只能首帧之后再纠正。
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isWidth(saved)) setWidthState(saved);
    } catch {
      // 隐私模式等场景下 localStorage 不可用 —— 用默认值即可
    }
  }, []);

  const setWidth = useCallback((w: ContentWidth) => {
    setWidthState(w);
    try {
      localStorage.setItem(STORAGE_KEY, w);
    } catch {
      // 同上
    }
  }, []);

  const cycle = useCallback(() => {
    setWidthState((prev) => {
      const next = ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]!;
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
      {children}
    </ContentWidthContext.Provider>
  );
}

export function useContentWidth() {
  return useContext(ContentWidthContext);
}
