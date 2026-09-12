import { useEffect, useRef, useState } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import "react-activity-calendar/tooltips.css";

import { useTheme } from "#provider/theme-provider";
import { CALENDAR_COLORS } from "#components/user/colors";
import type { ActivityDay } from "#lib/activity";

const CELL = 13 + 2;
function isoDayUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

const WEEKDAY_LABEL_W = 30;
const FULL_YEAR_WEEKS = 53;
const MIN_WEEKS = 8;

function fmtDate(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

export default function Heatmap({ data }: { data: ActivityDay[] }) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const weeks =
    width === null
      ? FULL_YEAR_WEEKS
      : Math.max(
          MIN_WEEKS,
          Math.min(FULL_YEAR_WEEKS, Math.floor((width - WEEKDAY_LABEL_W) / CELL) + 1),
        );

  const shown = (() => {
    if (weeks >= FULL_YEAR_WEEKS) return data;

    const todayISO = isoDayUTC(new Date());
    const start = new Date(Date.parse(`${todayISO}T00:00:00.000Z`) - (weeks * 7 - 1) * 86400000);
    const startISO = isoDayUTC(start);

    const windowed = data.filter((d) => d.date >= startISO && d.date <= todayISO);
    if (windowed[0]?.date !== startISO) {
      windowed.unshift({ date: startISO, count: 0, level: 0 });
    }
    if (windowed[windowed.length - 1]?.date !== todayISO) {
      windowed.push({ date: todayISO, count: 0, level: 0 });
    }
    return windowed;
  })();

  return (
    <div ref={hostRef} className="w-full">
      <ActivityCalendar
        data={shown}
        colorScheme={theme}
        theme={CALENDAR_COLORS}
        weekStart={0}
        blockSize={13}
        blockMargin={2}
        blockRadius={2}
        fontSize={12}
        labels={{
          months: [
            "1月",
            "2月",
            "3月",
            "4月",
            "5月",
            "6月",
            "7月",
            "8月",
            "9月",
            "10月",
            "11月",
            "12月",
          ],
          weekdays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
          totalCount: `近 ${weeks} 周共 {{count}} 次记录`,
          legend: { less: "少", more: "多" },
        }}
        tooltips={{
          activity: {
            text: (a) =>
              a.count === 0
                ? `${fmtDate(a.date)} · 无记录`
                : `${fmtDate(a.date)} · 记录 ${a.count} 次`,
          },
        }}
      />
    </div>
  );
}
