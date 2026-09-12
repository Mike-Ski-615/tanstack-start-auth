const KEY = "sidebar-width";

export const SIDEBAR_WIDTH_BOUNDS = { min: 180, max: 420, fallback: 256 };

export function readSidebarWidth(): number {
  const { min, max, fallback } = SIDEBAR_WIDTH_BOUNDS;
  try {
    const parsed = Number(localStorage.getItem(KEY));
    if (Number.isFinite(parsed) && parsed > 0)
      return Math.min(max, Math.max(min, Math.round(parsed)));
  } catch {}
  return fallback;
}

export function writeSidebarWidth(value: number): number {
  const { min, max } = SIDEBAR_WIDTH_BOUNDS;
  const clamped = Math.min(max, Math.max(min, Math.round(value)));
  try {
    localStorage.setItem(KEY, String(clamped));
  } catch {}
  return clamped;
}
