/**
 * 会话管理：核心原语与登录动作。
 *
 * 原语：
 * - createAuthenticatedSession(): 创建认证会话（Device + Session）
 * - invalidateAllSessions(): 全局失效
 * - createResetOtp() / verifyResetOtp(): 密码重置验证码
 *
 * 登录动作：
 * - signIn(): 建会话 + 写两块 cookie（所有「登录成功」路径的统一入口）
 */

import { db } from "#prisma/db";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { PUBLIC_COLUMNS, type User } from "./current-user";
import { generateToken, hashToken } from "./token";
import { generateOtp, hashOtp, MAX_OTP_ATTEMPTS } from "./otp";
import { ensureDevice } from "./device";
import { setSessionCookie, setDeviceCookie, getDeviceKey } from "./session";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 分钟

export type Session = {
  id: string;
  userId: string;
  deviceId: string;
  tokenHash: string;
  sessionVersion: number;
  userAgent: string;
  ip: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type ResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

// ============================================================
// 核心原语 1：创建认证会话
// ============================================================

/**
 * 创建认证会话：确保 Device → 删除旧 Session → 创建新 Session。
 *
 * 单设备保证：Device.userId UNIQUE → 一用户一设备。
 *
 * 职责边界：
 * - ensureDevice() 只管 Device
 * - createAuthenticatedSession() 只管 Session
 *
 * @returns { token, deviceKey } 原始令牌 + deviceKey
 */
export async function createAuthenticatedSession(params: {
  userId: string;
  deviceKey?: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; deviceKey: string }> {
  const { userId, deviceKey, userAgent = null, ip = null } = params;

  // 1. 确保 Device（单设备冲突时自动替换，不管 Session）
  const { device, deviceKey: finalDeviceKey } = await ensureDevice({
    userId,
    existingDeviceKey: deviceKey,
    userAgent,
    ip,
  });

  // 2. 删除旧 Session
  //
  // 一条 DELETE 完成，不做 SELECT + DELETE 两步：两步写法在并发登录时
  // 是 TOCTOU —— 两个请求可能都读到同一条旧 Session，各自删一次，后到者
  // 读到的还是已经被删掉的那条。单条 DELETE 没有这个窗口。
  await db.orm.public.Session.where({ userId: userId }).delete();

  // 3. 读取当前 sessionVersion
  const user = await db.orm.public.User.where({ id: userId }).first();
  const sessionVersion = user?.sessionVersion ?? 0;

  // 4. 创建新 Session
  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await db.orm.public.Session.create({
    userId,
    deviceId: device.id,
    tokenHash,
    sessionVersion,
    userAgent: userAgent ?? "",
    ip: ip ?? "unknown",
    expiresAt,
  });

  return { token: rawToken, deviceKey: finalDeviceKey };
}

/**
 * 登录：建会话 + 写两块 cookie。
 *
 * 为什么需要它：登录/邮箱验证/改密/重置密码四条路径都要做同一件事，
 * 原先各自摊开写四行（建会话 + 设两个 cookie），且都得自己从请求里
 * 挖 user-agent / IP。抽成一函数后：
 *
 * - 调用方从 4 行 + 3 个入参降到 1 行 + 1 个入参
 * - 「两块 cookie 必须同时设」这个约束由本函数强制，不再靠人记住
 * - 忘设 device cookie 会让每次登录都换新 Device（静默降级），已不可能
 *
 * deviceKey 统一从 cookie 读（不再由调用方传入）：deviceKey 是「设备身份
 * 标识」，生命周期长于 Session（见 CONTEXT.md）。因此凡建立会话的路径都应
 * 复用当前浏览器已有的 Device。曾只有 login 读了 cookie，另三条每次都新建
 * Device —— 同一浏览器改个密码就"换了设备"，与上述定义相矛盾。
 */
export async function signIn(userId: string): Promise<void> {
  const { token, deviceKey } = await createAuthenticatedSession({
    userId,
    deviceKey: getDeviceKey(),
    userAgent: getRequestHeader("user-agent"),
    ip: getRequestIP(),
  });

  setSessionCookie(token);
  setDeviceCookie(deviceKey);
}

// ============================================================
// 核心原语 2：全局失效所有会话
// ============================================================

/**
 * 递增 User.sessionVersion → 所有旧 Session 全局失效。
 * 用于改密、撤销全部会话。
 *
 * 单条原子 UPDATE（SET "sessionVersion" = "sessionVersion" + 1），
 * 不再是原先的 read-modify-write（SELECT → JS +1 → UPDATE 绝对值）——
 * 那样并发时会互相覆盖写回同一个值，丢失递增。
 *
 * user 不存在时影响 0 行，静默返回（与旧实现一致）。
 */
export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.runtime().execute(
    db.sql.public.User.update((f, fns) => ({
      sessionVersion: fns.raw`${f.sessionVersion} + 1`.returns({
        codecId: "pg/int4@1",
      }),
    }))
      .where((f, fns) => fns.eq(f.id, userId))
      .build(),
  );
}

// ============================================================
// 会话校验
// ============================================================

/**
 * 校验会话令牌，并连带取回公开形态的 User：
 * 1. 查哈希 → 未过期 → 未撤销
 * 2. 检查 sessionVersion 是否匹配 User.sessionVersion
 *
 * User 通过 Session.user 关系在同一次查询里带出：为了比 sessionVersion 反正也得读它，
 * 顺带返回，调用方（guard）不必再查一次。
 */
export async function validateSession(
  rawToken: string,
): Promise<{ session: Session; user: User } | null> {
  const tokenHash = hashToken(rawToken);

  const session = await db.orm.public.Session.where({ tokenHash })
    .include("user", (u) => u.select(...PUBLIC_COLUMNS))
    .first();
  if (!session) return null;
  if (session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  // sessionVersion 校验
  const { user } = session;
  if (user.sessionVersion !== session.sessionVersion) return null;

  return { session, user };
}

// ============================================================
// 撤销
// ============================================================

/**
 * 撤销指定令牌对应的会话（DB 标记 revokedAt，幂等）。
 */
export async function revokeSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db.orm.public.Session.where({ tokenHash }).update({
    revokedAt: new Date().toISOString(),
  });
}

// ============================================================
// 清理
// ============================================================

/** 清理过期会话（定时任务或手动调用）。 */
export async function purgeExpiredSessions(): Promise<number> {
  const now = new Date().toISOString();
  // DB-side 条件删除，避免 O(N) 读取 + JS 过滤
  const deleted = await db.orm.public.Session.where((s) =>
    s.expiresAt.lt(now),
  ).deleteAndCount();
  return deleted;
}

// ============================================================
// 密码重置 OTP
// ============================================================

/** 创建密码重置 OTP：先作废该用户旧的重置 OTP，再生成一个新的。 */
export async function createResetOtp(userId: string): Promise<string> {
  const otp = generateOtp();
  const tokenHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  const now = new Date().toISOString();

  // 旧 OTP 一律作废，保证一个用户同一时刻只有一个可用重置 OTP
  const unused = await db.orm.public.ResetToken.where((t) =>
    t.userId.eq(userId),
  )
    .where((t) => t.usedAt.isNull())
    .all();

  for (const t of unused) {
    await db.orm.public.ResetToken.where({ id: t.id }).update({ usedAt: now });
  }

  await db.orm.public.ResetToken.create({
    userId,
    tokenHash,
    expiresAt,
  });

  return otp;
}

/** 密码重置 OTP 的校验结果。 */
export type VerifyResetOtpResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

/**
 * 校验密码重置 OTP。
 *
 * 与邮箱验证同一套逻辑：6 位数字必须计错误次数（见 MAX_OTP_ATTEMPTS），
 * 否则限速之外的暴力枚举仍能撞开。必须先按 userId 取记录再比对，
 * 不能按 otp 查 —— 百万级空间下不同用户可能撞到同一个值。
 */
export async function verifyResetOtp(
  userId: string,
  otp: string,
): Promise<VerifyResetOtpResult> {
  const now = new Date();

  const record = await db.orm.public.ResetToken.where((t) =>
    t.userId.eq(userId),
  )
    .where((t) => t.usedAt.isNull())
    .first();

  if (!record) return { ok: false, reason: "invalid" };
  if (new Date(record.expiresAt).getTime() < now.getTime()) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await db.orm.public.ResetToken.where({ id: record.id }).update({
      usedAt: now.toISOString(),
    });
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.tokenHash !== hashOtp(otp)) {
    const next = record.attempts + 1;
    await db.orm.public.ResetToken.where({ id: record.id }).update({
      attempts: next,
      ...(next >= MAX_OTP_ATTEMPTS ? { usedAt: now.toISOString() } : {}),
    });
    return {
      ok: false,
      reason: next >= MAX_OTP_ATTEMPTS ? "too_many_attempts" : "invalid",
    };
  }

  await db.orm.public.ResetToken.where({ id: record.id }).update({
    usedAt: now.toISOString(),
  });

  return { ok: true, userId };
}
