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
import { createSession } from "#lib/auth/session-manager";
import { setSessionCookie } from "#lib/auth/session";

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
 * 改密后轮换会话令牌：撤销所有旧会话（含当前）→ 创建新令牌 → 设新 cookie。
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

    await db.orm.public.User.where({ id: user.id }).update({
      passwordHash: await hashPassword(newPassword),
    });

    // 改密后轮换会话：撤销所有旧会话（包括当前）→ 创建新令牌 → 设新 cookie
    // 即使攻击者持有旧 token，改密后立即失效
    const newToken = await createSession({
      userId: user.id,
      userAgent: getRequestHeader("user-agent"),
      ip: getRequestIP(),
    });
    setSessionCookie(newToken);

    return { success: true as const };
  });
