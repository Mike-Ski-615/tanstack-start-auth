import * as React from "react";

/**
 * Tailwind 的断点刻度（min-width），与 theme.css 的 --breakpoint-* 一致。
 *
 * 写在这里供 JS 侧引用 —— CSS 用 `lg:block`、JS 用 `"lg"`，两边指的是同一个
 * 数字，不会各写一遍 1024 然后悄悄错开。
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * 是否小于某个断点（即该断点以下 = “窄屏”）。
 *
 * 语义与 Tailwind 的 `min-width` 相反：`useIsBelow("lg")` 为 true 等价于
 * `lg:` 前缀的样式**还没生效**。这样 JS 判断与 CSS 类就能直接对上：
 *
 *   const compact = useIsBelow("lg");        // JS
 *   className="hidden lg:block"              // CSS，同一个 1024
 *
 * 首帧返回 false（等于“宽屏”），因为 SSR/首屏拿不到 window。
 */
export function useIsBelow(breakpoint: Breakpoint = "lg") {
  const min = BREAKPOINTS[breakpoint];
  const [below, setBelow] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${min - 1}px)`);
    const onChange = () => setBelow(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [min]);

  return below;
}

/**
 * 窄屏（默认 lg 以下）= Sheet 抽屉接管侧栏的区间。
 *
 * 必须与「桌面侧栏」的显示断点一致：sidebar.tsx 的 Sidebar 是 `hidden lg:block`。
 * 两者不小心错开，就会出现「桌面侧栏已渲染、抽屉又不接管」的死区 ——
 * 侧栏卡在展开态且没有任何可见控件。改这里就得同步改 sidebar.tsx 的 lg:block、
 * sidebar-trigger.tsx 的 lg:flex、panel-left-open.tsx / header/index.tsx 的 lg:hidden。
 */
export function useIsMobile() {
  return useIsBelow("lg");
}
