import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";
import { useAppSession } from "#lib/auth/session";
import { hashPassword, verifyPassword } from "#lib/auth/password";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "#schemas/auth";

/**
 * 更新当前登录用户的可编辑资料（name / bio）。
 * 仅能改自己：身份取自会话，不接受 userId 入参。
 */
export const updateProfileFn = createServerFn({
  method: "POST",
})
  .validator(updateProfileSchema)
  .handler(async ({ data: { name, bio } }) => {
    const session = await useAppSession();
    const userId = session.data.userId;
    if (!userId) throw new Error("unauthorized");

    await db.orm.public.User.where({ id: userId }).update({
      name,
      bio,
    });

    return { success: true as const };
  });

/**
 * 修改当前登录用户的密码。需先校验当前密码，再写新哈希。
 * 防枚举：当前密码错误与用户不存在抛同一笼统文案。
 */
export const changePasswordFn = createServerFn({
  method: "POST",
})
  .validator(changePasswordSchema)
  .handler(async ({ data: { currentPassword, newPassword } }) => {
    const session = await useAppSession();
    const userId = session.data.userId;
    if (!userId) throw new Error("当前密码不正确");

    const user = await db.orm.public.User.where({ id: userId }).first();
    const ok = user && (await verifyPassword(user.passwordHash, currentPassword));

    if (!ok) throw new Error("当前密码不正确");

    await db.orm.public.User.where({ id: userId }).update({
      passwordHash: await hashPassword(newPassword),
    });

    return { success: true as const };
  });
