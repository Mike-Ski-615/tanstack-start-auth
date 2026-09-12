import type { ColorScheme } from "react-activity-calendar";

export type ActivityTheme = "light" | "dark";

const LEVELS: Record<ActivityTheme, string[]> = {
  light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  dark: ["#21262d", "#0e4429", "#006d32", "#26a641", "#39d353"],
};

export function levelPalette(theme: ActivityTheme): readonly string[] {
  return LEVELS[theme];
}

export const CALENDAR_COLORS: Record<ColorScheme, string[]> = LEVELS;
