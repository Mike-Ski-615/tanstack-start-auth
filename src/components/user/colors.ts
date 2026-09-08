import type { ColorScheme } from "react-activity-calendar";

// Activity levels 0..4, shared by the heatmap and any summary (e.g. the
// "this week" card). One GitHub-style ramp per theme so every surface colors
// a day identically and follows the app theme together.
export type ActivityTheme = "light" | "dark";

const LEVELS: Record<ActivityTheme, string[]> = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#21262d", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

export function levelPalette(theme: ActivityTheme): readonly string[] {
  return LEVELS[theme];
}

// react-activity-calendar wants plain `{ light, dark }` arrays, so pair them
// (level 0 is the "no activity" cell, 4 the busiest).
export const CALENDAR_COLORS: Record<ColorScheme, string[]> = LEVELS;
