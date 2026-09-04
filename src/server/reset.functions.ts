import { createServerFn } from "@tanstack/react-start";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";
import { emailOnlySchema, resetPasswordSchema } from "#schemas/auth";
import { useAppSession } from "#lib/session";
import { signUserToken, readUserToken } from "#lib/jwt";
import { hashPassword } from "./password";
import { sendMail } from "./mail";

/**
 * 密码重置用例（无状态版）：令牌为一枚 HS256 JWT { sub: userId, exp }，
 * 复用 SESSION_SECRET 签名，不落库；验签即验身份与时效。
 * 与登录会话的无状态 cookie 同一哲学（见 session.ts 注释）。
 *
 * 令牌签发与验签收口在 #lib/jwt（signUserToken / readUserToken），
 * 本模块只描述用例流程。
 */

/**
 * 请求密码重置。防枚举：无论邮箱是否存在，恒返回同一响应。
 */
export const requestPasswordResetFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data: { email } }) => {
    const user = await db.orm.public.User.where({ email }).first();

    if (user) {
      const token = await signUserToken(user.id);
      await sendMail(
        email,
        "重置你的密码",
        [
          "点击下面的链接重置你的密码（15 分钟内有效）：",
          "",
          `${process.env.APP_URL}/auth/reset?token=${token}`,
          "",
          "如果你没有发起此请求，可以安全地忽略这封邮件。",
        ].join("\n"),
      );
    }

    return { success: true };
  });

/**
 * 重置密码：验签令牌 → 改密 → 写入新会话（自动登录）。
 */
export const resetPasswordFn = createServerFn({
  method: "POST",
})
  .validator(resetPasswordSchema)
  .handler(async ({ data: { token, password } }) => {
    const userId = await readUserToken(token);
    if (!userId) throw new Error("invalid_token");

    await db.orm.public.User.where({ id: userId }).update({
      passwordHash: await hashPassword(password),
    });

    const session = await useAppSession();
    await session.update({ userId });

    return { success: true };
  });
