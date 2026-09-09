import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeader,
  getRequestIP,
} from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { hashPassword, verifyPassword } from "#lib/auth/password";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "#schemas/auth";
import { getCurrentUser } from "#lib/auth/guard";
import {
  createAuthenticatedSession,
  invalidateAllSessions,
} from "#lib/auth/session-manager";
import { setSessionCookie, setDeviceCookie } from "#lib/auth/session";
import { kickSession } from "#lib/auth/ws-registry";

/**
 * 更新当前登录用户的可编辑资料（name / bio）。
 * 仅能改自己：身份取自会话，不接受 userId 入参。
 */
export const updateProfileFn = createServerFn({
  method: "POST",
})
  .validator(updateProfileSchema)
  .handler(async ({ data: { name, bio } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("unauthorized");

    await db.orm.public.User.where({ id: user.id }).update({
      name,
      bio,
    });

    return { success: true as const };
  });

/**
 * 修改当前登录用户的密码。需先校验当前密码，再写新哈希。
 * 改密后全局失效所有旧 Session → createAuthenticatedSession。
 * 即使攻击者持有旧 token，改密后立即失效。
 * 防枚举：当前密码错误与用户不存在抛同一笼统文案。
 */
export const changePasswordFn = createServerFn({
  method: "POST",
})
  .validator(changePasswordSchema)
  .handler(async ({ data: { currentPassword, newPassword } }) => {
    const user = await getCurrentUser();
    if (!user) throw new Error("当前密码不正确");

    const fullUser = await db.orm.public.User.where({ id: user.id }).first();
    const ok =
      fullUser &&
      (await verifyPassword(fullUser.passwordHash, currentPassword));

    if (!ok) throw new Error("当前密码不正确");

    // fail-closed：先失效所有旧 Session，再改密码
    // 如果 invalidate 失败，密码不会被修改（用户被登出但密码安全）
    await invalidateAllSessions(user.id);

    await db.orm.public.User.where({ id: user.id }).update({
      passwordHash: await hashPassword(newPassword),
    });

    // 创建新 Device + Session（自动登录）
    const { token, deviceKey, oldSessionId } = await createAuthenticatedSession({
      userId: user.id,
      userAgent: getRequestHeader("user-agent"),
      ip: getRequestIP(),
    });
    setSessionCookie(token);
    setDeviceCookie(deviceKey);

    // 踢掉旧 Session 的 WebSocket 连接
    if (oldSessionId) {
      kickSession(oldSessionId as unknown as string);
    }

    return { success: true as const };
  });
