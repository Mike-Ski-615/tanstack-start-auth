import { useEffect, useRef, useState } from "react";
import { ActivityCalendar } from "react-activity-calendar";
import "react-activity-calendar/tooltips.css";

import { useTheme } from "#provider/theme-provider";
import { CALENDAR_COLORS } from "./colors";
import type { ActivityDay } from "#lib/activity";

/** 每天一列。blockSize + blockMargin，与下面的 props 保持一致。 */
const CELL = 13 + 2;
/** UTC 日期串，与 lib/activity 的日期口径一致。 */
function isoDayUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** 星期标签占的宽度（"周日" 二字 + 间距），从可用宽度里扣掉。 */
const WEEKDAY_LABEL_W = 30;
/** 全年周数（含首尾不完整周）。 */
const FULL_YEAR_WEEKS = 53;
/** 再窄也至少显示这么多周，否则不成图表。 */
const MIN_WEEKS = 8;

/**
 * 按容器宽度决定显示多少周。
 *
 * 窄容器里塞整年 = 格子缩到看不清：实测把 53 周压进手机的 296px，格子
 * 只有 4.9×4.9px。而 SVG 宽度就是「周数 × 单元格」，所以正确做法不是
 * 缩小格子，而是**减少周数** —— 格子维持 13px 可读尺寸。
 *
 * 宽度未知（首帧 / SSR）时返回整年，与服务端渲染一致，不闪。
 */
export function pickWeeks(containerWidth: number | null): number {
  if (containerWidth === null) return FULL_YEAR_WEEKS;
  const fit = Math.floor((containerWidth - WEEKDAY_LABEL_W) / CELL) + 1;
  return Math.max(MIN_WEEKS, Math.min(FULL_YEAR_WEEKS, fit));
}

/**
 * 取最近 N 周的数据。
 *
 * **必须按今天往前切，不能 `slice(-weeks*7)`**：data 是整年 1/1–12/31，
 * 尾部是未来的空格子（buildActivityCalendar 把未来强制清零）。按数组
 * 尾部切会切到年底那些空日子 —— 实测出现过「近 8 周共 0 次记录」，
 * 而「本周」明明有几十次。
 */
export function visibleWeeks(data: ActivityDay[], weeks: number, now = new Date()): ActivityDay[] {
  if (weeks >= FULL_YEAR_WEEKS) return data;

  const idx = data.findIndex((d) => d.date === isoDayUTC(now));
  if (idx < 0) return data.slice(-weeks * 7);

  // 含今天在内，往前取 weeks 周
  return data.slice(Math.max(0, idx - weeks * 7 + 1), idx + 1);
}

function fmtDate(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}月${Number(d)}日`;
}

export default function Heatmap({ data }: { data: ActivityDay[] }) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  // 量容器自身宽度而非视口：这一页挨着可折叠侧边栏，视口宽不代表可用宽。
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      // entries 至少一条（只 observe 了一个元素），但类型上不保证 ——
      // 用解构默认挡一下，比 entry! 安全：真的空数组时不会崩。
      const entry = entries[0];
      if (!entry) return;
      setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /*
   * 窄容器里塞整年 = 格子缩到看不清。
   *
   * 实测：把整年（53 周）等比压进手机的 296px，格子只有 4.9×4.9px ——
   * 色块几乎无法辨认。而 SVG 的宽度就是「周数 × 格子大小」，所以正确
   * 做法不是缩小格子，而是**减少显示的周数**：格子维持 13px 可读尺寸，
   * 只展示最近能放下的那几周（GitHub 等产品的窄屏行为也是如此）。
   *
   * 宽度未知时（首帧 / SSR）按整年渲染 —— 与原来一致，不闪。
   */
  // 星期标签由组件渲染在 SVG 左侧（给它留了 marginLeft），所以可用宽度
  // 要扣掉标签那一列，否则标签会被 scroll-container 的 maxWidth:100% 裁掉。
  const weeks =
    width === null
      ? FULL_YEAR_WEEKS
      : Math.max(8, Math.min(FULL_YEAR_WEEKS, Math.floor((width - WEEKDAY_LABEL_W) / CELL) + 1));

  /*
   * 按**今天往前**切，不能按数组尾部切。
   *
   * data 是整年 1/1–12/31，尾部是未来的空格子（buildActivityCalendar 会把
   * 未来日期强制清零）。直接 slice(-weeks*7) 取到的是年底那些空日子 ——
   * 实测在 1024px 出现过「近 8 周共 0 次记录」而「本周」明明有 34 次。
   */
  const shown = (() => {
    if (weeks >= FULL_YEAR_WEEKS) return data;

    const todayISO = isoDayUTC(new Date());
    const idx = data.findIndex((d) => d.date === todayISO);
    if (idx < 0) return data.slice(-weeks * 7);

    // 含今天在内，往前取 weeks 周
    return data.slice(Math.max(0, idx - weeks * 7 + 1), idx + 1);
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
