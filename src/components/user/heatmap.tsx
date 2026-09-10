import { ActivityCalendar } from "react-activity-calendar";
import "react-activity-calendar/tooltips.css";

import { useTheme } from "#provider/theme-provider";
import { CALENDAR_COLORS } from "./colors";

function fmtDate(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

import type { ActivityDay } from "#lib/activity";

export default function Heatmap({ data }: { data: ActivityDay[] }) {
  const { theme } = useTheme();

  // blockSize + blockMargin give the full-year SVG a fixed ~793px width
  // (53 weeks). The [&_svg] classes below let it scale down proportionally
  // instead of overflowing into a horizontal scroll.

  return (
    <ActivityCalendar
      data={data}
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
        totalCount: "今年共 {{count}} 次记录",
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
  );
}
