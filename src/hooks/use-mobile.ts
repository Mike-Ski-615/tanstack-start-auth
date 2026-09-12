import * as React from "react";

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

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

export function useIsMobile() {
  return useIsBelow("lg");
}
