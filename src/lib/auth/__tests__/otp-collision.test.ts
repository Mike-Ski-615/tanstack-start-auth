import "#test/mock-server-env";
import { describe, it, expect, afterEach } from "vitest";
import { db } from "#prisma/db";
import { createUser, deleteUser } from "#test/helpers";
import { hashOtp } from "#lib/auth/otp";
import { createVerificationOtp, verifyEmailOtp } from "#lib/auth/email-verification";
import { createResetOtp, verifyResetOtp } from "#lib/auth/reset-otp";

/**
 * OTP 撞码：不同用户拿到同一个 6 位数字是**正常**的。
 *
 * 背景（真 bug，已修）：两张 OTP 表的 tokenHash 一度带全局 UNIQUE 约束。
 * 而 hashOtp 是无盐纯函数、OTP 只有 100 万种 —— 两个用户撞码时，第二个
 * 人的注册/重置会直接 500（重复键违反唯一约束）。用户量上来后这是偶发
 * 但必然发生的故障。
 *
 * 约束是多余的：consumeOtp 按 **userId** 查记录（store.findLive(userId)），
 * 从不按 tokenHash 查 —— 撞码本无害。已从契约里去掉，见 ADR-0006。
 *
 * 这组测试守两件事：
 * 1. 同码可以共存（约束真去掉了）
 * 2. 同码共存时，各自的校验仍互不干扰（这才是「撞码无害」的证明）
 */

const created: string[] = [];

afterEach(async () => {
  for (const id of created.splice(0)) await deleteUser(id);
});

async function twoUsers() {
  const a = await createUser({ verified: false });
  const b = await createUser({ verified: false });
  created.push(a.user.id, b.user.id);
  return { a, b };
}

describe("邮箱验证 OTP 撞码", () => {
  it("两个用户可以持有相同 tokenHash", async () => {
    const { a, b } = await twoUsers();
    const shared = hashOtp("123456");

    await db.orm.public.EmailVerificationToken.create({
      userId: a.user.id,
      tokenHash: shared,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
    // 修复前：这一行抛「重复键违反唯一约束」
    await db.orm.public.EmailVerificationToken.create({
      userId: b.user.id,
      tokenHash: shared,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    });

    const rows = await db.orm.public.EmailVerificationToken.where((t) =>
      t.tokenHash.eq(shared),
    ).all();
    expect(rows).toHaveLength(2);
  });

  it("撞码时各自的校验互不干扰", async () => {
    const { a, b } = await twoUsers();
    const shared = "654321";
    const h = hashOtp(shared);
    const exp = new Date(Date.now() + 900_000).toISOString();

    await db.orm.public.EmailVerificationToken.create({
      userId: a.user.id,
      tokenHash: h,
      expiresAt: exp,
    });
    await db.orm.public.EmailVerificationToken.create({
      userId: b.user.id,
      tokenHash: h,
      expiresAt: exp,
    });

    // 用同一个码验 A —— 必须成功，且只影响 A
    const r = await verifyEmailOtp(a.user.id, shared);
    expect(r.ok).toBe(true);

    const uA = await db.orm.public.User.where({ id: a.user.id }).first();
    const uB = await db.orm.public.User.where({ id: b.user.id }).first();
    expect(uA!.emailVerifiedAt).toBeTruthy();
    // B 完全没被碰到
    expect(uB!.emailVerifiedAt ?? null).toBeNull();
  });

  it("B 的码不能用来验 A（仍按 userId 查记录）", async () => {
    const { a, b } = await twoUsers();
    const otpB = await createVerificationOtp(b.user.id);
    const otpA = await createVerificationOtp(a.user.id);
    // 两个 6 位码大概率不同；万一撞了这条就没意义了，跳过
    if (otpA === otpB) return;

    // 拿 B 的码去验 A —— 应失败（A 的记录里存的不是这个码）
    const r = await verifyEmailOtp(a.user.id, otpB);
    expect(r.ok).toBe(false);
  });
});

describe("重置 OTP 撞码", () => {
  it("两个用户可以持有相同 tokenHash", async () => {
    const { a, b } = await twoUsers();
    const shared = hashOtp("111222");

    await db.orm.public.ResetToken.create({
      userId: a.user.id,
      tokenHash: shared,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
    await db.orm.public.ResetToken.create({
      userId: b.user.id,
      tokenHash: shared,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    });

    const rows = await db.orm.public.ResetToken.where((t) => t.tokenHash.eq(shared)).all();
    expect(rows).toHaveLength(2);
  });

  it("撞码时各自的校验互不干扰", async () => {
    const { a, b } = await twoUsers();
    const shared = "333444";
    const h = hashOtp(shared);
    const exp = new Date(Date.now() + 900_000).toISOString();

    await db.orm.public.ResetToken.create({
      userId: a.user.id,
      tokenHash: h,
      expiresAt: exp,
    });
    await db.orm.public.ResetToken.create({
      userId: b.user.id,
      tokenHash: h,
      expiresAt: exp,
    });

    const r = await verifyResetOtp(a.user.id, shared);
    expect(r.ok).toBe(true);

    const bRows = await db.orm.public.ResetToken.where((t) => t.userId.eq(b.user.id)).all();
    // B 的记录仍是活的（没被 A 的校验消费掉）
    expect(bRows.every((t) => t.usedAt == null)).toBe(true);
  });
});

describe("连续创建 OTP 不因撞码而失败", () => {
  it("同一用户多次创建（旧记录作废）不受影响", async () => {
    const { a } = await twoUsers();

    const first = await createVerificationOtp(a.user.id);
    const second = await createVerificationOtp(a.user.id);

    expect(first).toMatch(/^\d{6}$/);
    expect(second).toMatch(/^\d{6}$/);

    // 旧的已作废，只有最新那个能用
    const r = await verifyEmailOtp(a.user.id, second);
    expect(r.ok).toBe(true);
  });

  it("多个用户各自的 OTP 都能创建（不互斥）", async () => {
    const users = [];
    for (let i = 0; i < 6; i++) {
      const u = await createUser({ verified: false });
      created.push(u.user.id);
      users.push(u.user.id);
    }

    const otps = await Promise.all(users.map((id) => createResetOtp(id)));
    for (const otp of otps) expect(otp).toMatch(/^\d{6}$/);
  });
});
