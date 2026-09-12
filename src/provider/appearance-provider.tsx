import { createPreference } from "#provider/preference-provider";

export type Accent = "orange" | "blue" | "green" | "violet" | "rose";

// 圆角：0–24px 连续可调，默认 10px（等于 CSS 的 0.625rem）。
export const RADIUS_RANGE = { min: 0, max: 24, step: 1, fallback: 10 } as const;
// 字号：90%–115% 连续缩放，默认 100%。
export const FONT_SCALE_RANGE = { min: 90, max: 115, step: 1, fallback: 100 } as const;

export const ACCENT_LABEL: Record<Accent, string> = {
  orange: "橙",
  blue: "蓝",
  green: "绿",
  violet: "紫",
  rose: "玫红",
};

export const ACCENT_SWATCH: Record<Accent, string> = {
  orange: "oklch(0.646 0.2 43)",
  blue: "oklch(0.588 0.196 254)",
  green: "oklch(0.627 0.17 149)",
  violet: "oklch(0.606 0.25 292)",
  rose: "oklch(0.645 0.246 16)",
};

function numericStrings(min: number, max: number) {
  return Array.from({ length: max - min + 1 }, (_, i) => String(min + i));
}

function applyRadius(value: string) {
  document.documentElement.style.setProperty("--radius", `${value}px`);
}

function applyFontScale(value: string) {
  document.documentElement.style.setProperty("--app-font-scale", `${value}%`);
}

function applyAccent(value: Accent) {
  document.documentElement.setAttribute("data-accent", value);
}

export const radius = createPreference<string>({
  key: "radius",
  attribute: "data-radius",
  values: numericStrings(RADIUS_RANGE.min, RADIUS_RANGE.max),
  fallback: String(RADIUS_RANGE.fallback),
  apply: applyRadius,
});

export const fontScale = createPreference<string>({
  key: "font-scale",
  attribute: "data-font-scale",
  values: numericStrings(FONT_SCALE_RANGE.min, FONT_SCALE_RANGE.max),
  fallback: String(FONT_SCALE_RANGE.fallback),
  apply: applyFontScale,
});

export const accent = createPreference<Accent>({
  key: "accent",
  attribute: "data-accent",
  values: ["orange", "blue", "green", "violet", "rose"],
  fallback: "orange",
  apply: applyAccent,
});
