import { describe, it, expect } from "vitest";
import { consumeOtp, type OtpRecord } from "#lib/auth/otp-store";
import { hashOtp, MAX_OTP_ATTEMPTS } from "#lib/auth/otp";

/**
 * 共享 OTP 规则的表驱动测试。
 *
 * 只测规则本身（用一个内存 store），不碰数据库 —— 两条真实流程的行为
 * 各自由 verify-otp.test.ts / reset-password.test.ts 的集成测试覆盖。
 */

function makeStore(init: Partial<OtpRecord> = {}) {
  let rec: OtpRecord | null = {
    id: "r1",
    tokenHash: hashOtp("123456"),
    attempts: 0,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ...init,
  };
  const calls: string[] = [];
  const store = {
    findLive: async () => rec,
    invalidate: async (id: string) => {
      calls.push("invalidate:" + id);
      rec = null;
    },
    bumpAttempts: async (id: string, next: number) => {
      calls.push(`bump:${id}:${next}`);
      if (rec) rec = { ...rec, attempts: next };
    },
  };
  return {
    store,
    calls,
    get rec() {
      return rec;
    },
  };
}

describe("consumeOtp — 基本规则", () => {
  it("正确的 OTP 通过", async () => {
    const s = makeStore();
    const r = await consumeOtp(s.store, "u1", "123456");
    expect(r).toEqual({ ok: true, userId: "u1" });
    expect(s.calls).toContain("invalidate:r1");
  });

  it("没有记录时 invalid", async () => {
    const s = makeStore();
    s.store.findLive = async () => null;
    const r = await consumeOtp(s.store, "u1", "123456");
    expect(r).toEqual({ ok: false, reason: "invalid" });
  });

  it("过期时 expired（且不作废）", async () => {
    const s = makeStore({ expiresAt: new Date(Date.now() - 1).toISOString() });
    const r = await consumeOtp(s.store, "u1", "123456");
    expect(r).toEqual({ ok: false, reason: "expired" });
    expect(s.calls).toHaveLength(0);
  });

  it("错误的 OTP 使 attempts 递增并返回 invalid", async () => {
    const s = makeStore();
    const r = await consumeOtp(s.store, "u1", "000000");
    expect(r).toEqual({ ok: false, reason: "invalid" });
    expect(s.calls).toEqual(["bump:r1:1"]);
  });
});

describe("consumeOtp — 错误次数上限", () => {
  it(`第 ${MAX_OTP_ATTEMPTS} 次判错时同时 bump 与 invalidate`, async () => {
    const s = makeStore({ attempts: MAX_OTP_ATTEMPTS - 1 });
    const r = await consumeOtp(s.store, "u1", "000000");

    expect(r).toEqual({ ok: false, reason: "too_many_attempts" });
    // 关键：attempts 必须被写入（与合并前行为一致 —— 原实现在超限那次
    // 写的是 update({ attempts: next, <作废列>: now })）
    expect(s.calls).toEqual([`bump:r1:${MAX_OTP_ATTEMPTS}`, "invalidate:r1"]);
  });

  it("已超限的记录直接作废，不再比对", async () => {
    const s = makeStore({ attempts: MAX_OTP_ATTEMPTS });
    const r = await consumeOtp(s.store, "u1", "123456"); // 即便 OTP 正确
    expect(r).toEqual({ ok: false, reason: "too_many_attempts" });
    expect(s.calls).toEqual(["invalidate:r1"]);
  });

  it("上限内最后一次判错后，正确 OTP 也过不了", async () => {
    const s = makeStore({ attempts: MAX_OTP_ATTEMPTS - 1 });
    await consumeOtp(s.store, "u1", "000000");
    const r = await consumeOtp(s.store, "u1", "123456");
    expect(r).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("consumeOtp — onSuccess 钩子", () => {
  it("成功时调用 onSuccess", async () => {
    let calledWith: string | null = null;
    const s = makeStore();
    await consumeOtp(
      {
        ...s.store,
        onSuccess: async (uid) => {
          calledWith = uid;
        },
      },
      "u1",
      "123456",
    );
    expect(calledWith).toBe("u1");
  });

  it("失败时不调用 onSuccess", async () => {
    let called = false;
    const s = makeStore();
    const r = await consumeOtp(
      {
        ...s.store,
        onSuccess: async () => {
          called = true;
        },
      },
      "u1",
      "000000",
    );
    expect(r.ok).toBe(false);
    expect(called).toBe(false);
  });

  it("不提供 onSuccess 也不报错", async () => {
    const s = makeStore();
    const r = await consumeOtp(s.store, "u1", "123456");
    expect(r.ok).toBe(true);
  });
});
