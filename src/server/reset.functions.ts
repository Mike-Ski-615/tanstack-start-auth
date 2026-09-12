import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { emailOnlySchema, resetPasswordSchema } from "#schemas/auth";
import { sendMail } from "#lib/auth/mail";
import { createResetOtp, verifyResetOtp } from "#lib/auth/reset-otp";
import { rotatePassword } from "#lib/auth/password-rotation";
import { enforceRateLimit } from "#lib/auth/rate-limiter";
import { ERROR_MESSAGE, OTP_REASON_MESSAGE } from "#lib/error-messages";

export const requestPasswordResetFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data: { email } }) => {
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

export const resetPasswordFn = createServerFn({
  method: "POST",
})
  .validator(resetPasswordSchema)
  .handler(async ({ data: { email, otp, password } }) => {
    const ip = getRequestIP();
    await enforceRateLimit("reset-verify", { email, ip });

    const user = await db.orm.public.User.where({ email }).first();
    if (!user) throw new Error(ERROR_MESSAGE.OTP_INVALID);

    const result = await verifyResetOtp(user.id, otp);
    if (!result.ok) throw new Error(OTP_REASON_MESSAGE[result.reason]);

    const userId = result.userId;

    await rotatePassword(userId, password);

    return { success: true };
  });
