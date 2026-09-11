import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { emailOnlySchema, resetPasswordSchema } from "#schemas/auth";
import { sendMail } from "../lib/auth/mail";
import { createResetOtp, verifyResetOtp } from "#lib/auth/reset-otp";
import { rotatePassword } from "#lib/auth/password-rotation";
import { enforceRateLimit } from "#lib/auth/rate-limiter";
import { ERROR_MESSAGE, OTP_REASON_MESSAGE } from "#lib/error-messages";

/**
 * 密码重置用例（DB 版）：重置令牌为一枚随机串 { userId, exp }，
 * SHA-256 哈希后落库，15 分钟有效。
 * 与哲学一致：单设备在线，撤销旧会话。
 */

/**
 * 请求密码重置。防枚举：无论邮箱是否存在，恒返回同一响应。
 */
export const requestPasswordResetFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data: { email } }) => {
    // 速率限制：同一 IP 1 分钟最多 3 次重置请求（防邮件轰炸）
    const ip = getRequestIP();
    await enforceRateLimit("reset", { ip });

    const user = await db.orm.public.User.where({ email }).first();

    if (user) {
      const otp = await createResetOtp(user.id);
      await sendMail(
        email,
        "重置你的密码",
        [
          "你的密码重置验证码是：",
          "",
          `    ${otp}`,
          "",
          "15 分钟内有效。如果你没有发起此请求，可以安全地忽略这封邮件。",
        ].join("\n"),
      );
    }

    return { success: true };
  });

/**
 * 重置密码：校验验证码 → 改密 → 全局失效旧 Session → createAuthenticatedSession。
 */
export const resetPasswordFn = createServerFn({
  method: "POST",
})
  .validator(resetPasswordSchema)
  .handler(async ({ data: { email, otp, password } }) => {
    // 限速：同一邮箱 + IP 组合 1 分钟最多 10 次
    const ip = getRequestIP();
    await enforceRateLimit("reset-verify", { email, ip });

    // 防枚举：用户不存在也报同一个验证码错误
    const user = await db.orm.public.User.where({ email }).first();
    if (!user) throw new Error(ERROR_MESSAGE.OTP_INVALID);

    const result = await verifyResetOtp(user.id, otp);
    if (!result.ok) throw new Error(OTP_REASON_MESSAGE[result.reason]);

    const userId = result.userId;

    // 注意：这里**不**写 User.emailVerifiedAt。
    //
    // 看似「能收到重置邮件就已经证明了邮箱归属」，但两者不等价：重置 OTP
    // 证明的是「此刻能收到这封信」，邮箱验证证明的是「用户主动确认了这个
    // 地址」。而且 emailVerifiedAt 不拦任何操作（登录 / 守卫都不看它），
    // 所以「不改就进不去门」这个理由也不成立。详见 ADR-0001（已否决）。
    await rotatePassword(userId, password);

    return { success: true };
  });
