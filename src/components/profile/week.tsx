import { useTheme } from "#provider/theme-provider";
import { activity } from "./activity";
import { levelPalette } from "./colors";

const DAY_MS = 86_400_000;
const DAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

// UTC helpers so the card agrees with activity.ts (same day boundary on the
// server and the browser → no hydration mismatch on the week total).
const now = new Date();
const todayStartUTC = Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate(),
);
function isoUTC(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
const todayISO = isoUTC(todayStartUTC);

// Each rendered color maps to the day's level via levelPalette, i.e. the SAME
// colors + source the heatmap uses, so both stay in lock-step.
export default function ThisWeek() {
  const { theme } = useTheme();
  const palette = levelPalette(theme);

  // Sunday-start week (matches the heatmap's weekStart=0), in UTC days.
  const sundayStartUTC = todayStartUTC - now.getUTCDay() * DAY_MS;
  const by = new Map(activity.map((a) => [a.date, a]));

  const days = Array.from({ length: 7 }, (_, i) => {
    const key = isoUTC(sundayStartUTC + i * DAY_MS);
    const a = by.get(key);
    const weekday = new Date(sundayStartUTC + i * DAY_MS).getUTCDay();
    return {
      key,
      label: key === todayISO ? "今" : DAY_LABELS[weekday],
      count: a?.count ?? 0,
      level: a?.level ?? 0,
      isToday: key === todayISO,
    };
  });
  const weekTotal = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex h-full w-full flex-col gap-3 rounded-2xl bg-card px-5 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold tracking-tight">本周</h2>
        <span className="text-xs text-muted-foreground">与热力图同源</span>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">
            {weekTotal}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            本周活动合计（次）
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {days.map((d) => (
            <div
              key={d.key}
              title={`${d.key}${d.isToday ? " · 今天" : ""} · ${d.count} 次`}
              className="flex w-4 flex-col items-center gap-0.5"
            >
              <span
                className={`block size-3 rounded-[2px] ${
                  d.isToday ? "ring-1 ring-foreground" : ""
                }`}
                style={{ background: palette[d.level] }}
              />
              <span
                className={`text-[9px] leading-none ${
                  d.isToday
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
