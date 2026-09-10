import { describe, it, expect, vi, afterEach } from "vitest";
import { daysSince } from "#lib/format";

afterEach(() => {
  vi.useRealTimers();
});

describe("daysSince", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  const at = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    return daysSince(iso);
  };

  it("刚创建时至少返回 1（不显示 0 天）", () => {
    expect(at(now.toISOString())).toBe(1);
  });

  it("不足一天也返回 1", () => {
    expect(at(new Date(now.getTime() - 3600_000).toISOString())).toBe(1);
  });

  it("按整天向下取整", () => {
    expect(at(new Date(now.getTime() - 86_400_000).toISOString())).toBe(1);
    expect(at(new Date(now.getTime() - 86_400_000 * 2).toISOString())).toBe(2);
    expect(at(new Date(now.getTime() - 86_400_000 * 10).toISOString())).toBe(
      10,
    );
  });

  it("满 30 天", () => {
    expect(at(new Date(now.getTime() - 86_400_000 * 30).toISOString())).toBe(
      30,
    );
  });

  // 时钟偏移或数据异常时不应出现 0 / 负数
  it("未来时间不会返回 0 或负数", () => {
    expect(at(new Date(now.getTime() + 86_400_000).toISOString())).toBe(1);
    expect(at(new Date(now.getTime() + 86_400_000 * 100).toISOString())).toBe(
      1,
    );
  });

  it("大跨度不出错", () => {
    expect(at(new Date(now.getTime() - 86_400_000 * 365).toISOString())).toBe(
      365,
    );
  });
});
