import { createPreference } from "#provider/preference-provider";

export type Radius = "sharp" | "default" | "round";
export type FontScale = "small" | "default" | "large";
export type Accent = "orange" | "blue" | "green" | "violet" | "rose";

export const RADIUS_LABEL: Record<Radius, string> = {
  sharp: "直角",
  default: "默认",
  round: "圆润",
};

export const FONT_SCALE_LABEL: Record<FontScale, string> = {
  small: "小",
  default: "标准",
  large: "大",
};

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

const RADIUS_VALUES: Record<Radius, string> = {
  sharp: "0rem",
  default: "",
  round: "1.25rem",
};

const FONT_SCALE_VALUES: Record<FontScale, string> = {
  small: "93.75%",
  default: "",
  large: "112.5%",
};

function applyRadius(value: Radius) {
  const root = document.documentElement;
  const css = RADIUS_VALUES[value];
  if (css) root.style.setProperty("--radius", css);
  else root.style.removeProperty("--radius");
}

function applyFontScale(value: FontScale) {
  const root = document.documentElement;
  const css = FONT_SCALE_VALUES[value];
  if (css) root.style.setProperty("--app-font-scale", css);
  else root.style.removeProperty("--app-font-scale");
}

function applyAccent(value: Accent) {
  document.documentElement.setAttribute("data-accent", value);
}

export type Motion = "system" | "full" | "reduced";

export const MOTION_LABEL: Record<Motion, string> = {
  system: "跟随系统",
  full: "始终开启",
  reduced: "始终关闭",
};

function applyMotion(value: Motion) {
  const root = document.documentElement;
  if (value === "system") root.removeAttribute("data-motion");
  else root.setAttribute("data-motion", value);
}

export const motion = createPreference<Motion>({
  key: "motion",
  attribute: "data-motion",
  values: ["system", "full", "reduced"],
  fallback: "system",
  apply: applyMotion,
});

export const radius = createPreference<Radius>({
  key: "radius",
  attribute: "data-radius",
  values: ["sharp", "default", "round"],
  fallback: "default",
  apply: applyRadius,
});

export const fontScale = createPreference<FontScale>({
  key: "font-scale",
  attribute: "data-font-scale",
  values: ["small", "default", "large"],
  fallback: "default",
  apply: applyFontScale,
});

export const accent = createPreference<Accent>({
  key: "accent",
  attribute: "data-accent",
  values: ["orange", "blue", "green", "violet", "rose"],
  fallback: "orange",
  apply: applyAccent,
});
