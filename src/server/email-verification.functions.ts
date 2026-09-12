import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { db } from "#prisma/db";
import { emailOnlySchema, verifyEmailOtpSchema } from "#schemas/auth";

import { signIn } from "#lib/auth/session-manager";
import { createVerificationOtp, verifyEmailOtp } from "#lib/auth/email-verification";
import { sendMail } from "#lib/auth/mail";
import { enforceRateLimit } from "#lib/auth/rate-limiter";
import { ERROR_MESSAGE, OTP_REASON_MESSAGE } from "#lib/error-messages";

export const verifyEmailFn = createServerFn({
  method: "POST",
})
  .validator(verifyEmailOtpSchema)
  .handler(async ({ data: { email, otp } }) => {
    const ip = getRequestIP();
    await enforceRateLimit("verify-otp", { email, ip });

    const user = await db.orm.public.User.where({ email }).first();
    if (!user) throw new Error(ERROR_MESSAGE.OTP_INVALID);

    const result = await verifyEmailOtp(user.id, otp);
    if (!result.ok) throw new Error(OTP_REASON_MESSAGE[result.reason]);

    await signIn(result.userId);

    return { success: true };
  });

export const resendVerificationEmailFn = createServerFn({
  method: "POST",
})
  .validator(emailOnlySchema)
  .handler(async ({ data: { email } }) => {
    const ip = getRequestIP();
    await enforceRateLimit("resend", { ip });

    await enforceRateLimit("resend", { email });

    const user = await db.orm.public.User.where({ email }).first();

    if (user && !user.emailVerifiedAt) {
      const otp = await createVerificationOtp(user.id);
      await sendMail(
        email,
        "验证你的邮箱",
        [
          "你的邮箱验证码是：",
          "",
          `    ${otp}`,
          "",
          "15 分钟内有效。如果你没有注册账号，可以安全地忽略这封邮件。",
        ].join("\n"),
      );
    }

    return { success: true as const };
  });
