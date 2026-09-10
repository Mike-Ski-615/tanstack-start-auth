import { describe, it, expect } from "vitest";
import { buildActivityCalendar, type ActivityDay } from "#lib/activity";
import { pickWeeks, visibleWeeks } from "../heatmap";

/**
 * 热力图在窄容器里显示多少周、以及切哪一段。
 *
 * 这两件事都是纯函数，抽出来测是因为它们踩过两个真实的坑：
 * 1. 只按宽度减格子会得到 0 周的边界（负数 / 小于下限）
 * 2. 按数据**数组尾部**切片会切到年底那些未来的空格子 ——
 *    data 是整年 1/1–12/31，尾部是未来，不是"最近"
 */

const CELL = 15;
const LABEL = 30;

describe("pickWeeks（按容器宽度选周数）", () => {
  it("宽度未知时给整年（首帧/SSR 不闪）", () => {
    expect(pickWeeks(null)).toBe(53);
  });

  it("极窄容器不会算出 0 或负数", () => {
    expect(pickWeeks(0)).toBeGreaterThanOrEqual(8);
    expect(pickWeeks(10)).toBeGreaterThanOrEqual(8);
    expect(pickWeeks(-100)).toBeGreaterThanOrEqual(8);
  });

  it("很宽的容器不超过全年周数", () => {
    expect(pickWeeks(5000)).toBe(53);
  });

  it("宽度越大周数越多（单调不减）", () => {
    const widths = [200, 300, 400, 600, 800, 1200, 2000];
    const weeks = widths.map((w) => pickWeeks(w));
    for (let i = 1; i < weeks.length; i++) {
      expect(weeks[i]!).toBeGreaterThanOrEqual(weeks[i - 1]!);
    }
  });

  it("算出的周数乘以格子宽度不超过容器", () => {
    for (const w of [300, 360, 414, 768, 1024, 1440]) {
      const weeks = pickWeeks(w);
      if (weeks >= 53) continue;
      // 标签列 + 周数 × 单元格，应放得下
      expect(LABEL + weeks * CELL).toBeLessThanOrEqual(w + CELL);
    }
  });
});

describe("visibleWeeks（按今天往前切数据）", () => {
  const NOW = new Date("2026-09-10T12:00:00Z");
  const year = buildActivityCalendar([], NOW);

  it("末尾是今天，不是 12/31", () => {
    const shown = visibleWeeks(year, 4, NOW);
    expect(shown[shown.length - 1]!.date).toBe("2026-09-10");
  });

  it("不包含今天之后的未来日期", () => {
    const shown = visibleWeeks(year, 4, NOW);
    expect(shown.every((d) => d.date <= "2026-09-10")).toBe(true);
  });

  it("显示最近 N 周（约 N×7 天）", () => {
    const shown = visibleWeeks(year, 4, NOW);
    expect(shown.length).toBe(28);
    expect(shown[0]!.date).toBe("2026-08-14"); // 9/10 往前 27 天
  });

  it("整年时原样返回", () => {
    expect(visibleWeeks(year, 53, NOW)).toBe(year);
  });

  it("首帧宽度未知（整年）时不裁掉任何数据", () => {
    const shown = visibleWeeks(year, 53, NOW);
    expect(shown.length).toBe(365);
  });

  it("今天不在数据里时退化为尾部切片（不抛错）", () => {
    const other = buildActivityCalendar([], new Date("2027-09-10T12:00:00Z"));
    const shown = visibleWeeks(other, 4, NOW); // NOW 在 2026，数据是 2027
    expect(shown.length).toBe(28);
  });

  it("跨年边界：1 月初只显示年初至今", () => {
    const jan = new Date("2026-01-05T12:00:00Z");
    const data = buildActivityCalendar([], jan);
    const shown = visibleWeeks(data, 4, jan);
    expect(shown[shown.length - 1]!.date).toBe("2026-01-05");
    expect(shown[0]!.date).toBe("2026-01-01"); // 不会越到上一年去
  });

  it("真实数据下最后一个格子带上今天的次数", () => {
    const events = [
      { userId: "u", createdAt: "2026-09-10T01:00:00Z" },
      { userId: "u", createdAt: "2026-09-10T09:00:00Z" },
    ];
    const data: ActivityDay[] = buildActivityCalendar(events, NOW);
    const shown = visibleWeeks(data, 2, NOW);
    const last = shown[shown.length - 1]!;
    expect(last.date).toBe("2026-09-10");
    expect(last.count).toBe(2);
  });
});
