import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { db } from "#prisma/db";

import { registerSchema } from "#schemas/auth";

import { hashPassword } from "#lib/auth/password";
import { createVerificationOtp } from "#lib/auth/email-verification";
import { sendMail } from "#lib/auth/mail";
import { enforceRateLimit } from "#lib/auth/rate-limiter";

const DEFAULT_IMAGE = "/default-user.webp";
const DEFAULT_BIO = "这个人很懒,什么也没有留下";

export const register = createServerFn({
  method: "POST",
})
  .validator(registerSchema)
  .handler(async ({ data: { name, email, password } }) => {
    const ip = getRequestIP();
    await enforceRateLimit("register", { ip });

    const existingUser = await db.orm.public.User.where({ email }).first();

    if (existingUser) {
      try {
        await sendMail(
          email,
          "你已注册过",
          [
            "这个邮箱已经注册过账号了。",
            "",
            "如果忘了密码，请在登录页使用「忘记密码」重置。",
            "如果不是你本人操作，可以忽略这封邮件。",
          ].join("\n"),
        );
      } catch (error) {
        console.error("[Register] 已存在账号的提醒邮件发送失败", error);
      }

      return {
        success: true,
        user: { email, name },
      };
    }

    const passwordHash = await hashPassword(password);

    const user = await db.orm.public.User.create({
      email,
      name,
      passwordHash,
      image: DEFAULT_IMAGE,
      bio: DEFAULT_BIO,
    });

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

    return {
      success: true,
      user: { email: user.email, name: user.name },
    };
  });
