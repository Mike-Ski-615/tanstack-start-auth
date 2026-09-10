import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseHeader } from "@tanstack/react-start/server";
import { db } from "#prisma/db";

import { registerSchema } from "#schemas/auth";

import { hashPassword } from "../lib/auth/password";
import { createVerificationToken } from "#lib/auth/email-verification";
import { sendMail } from "../lib/auth/mail";
import { rateLimit } from "#lib/auth/rate-limiter";

/** 注册表单不含头像/简介，给新用户初始值。 */
const DEFAULT_IMAGE = "/default-user.webp";
const DEFAULT_BIO = "这个人很懒,什么也没有留下";

/**
 * 注册开户用例：查重 → 建 User + EmailVerificationToken → 发验证邮件。
 *
 * 注册 ≠ 登录。注册后用户需点击邮件中的验证链接完成验证，
 * 验证通过后才创建 Session（自动登录）。
 *
 * 邮箱已占用直接 throw（客户端 onError 据此显示具体提示）；
 * 并发竞态由数据库唯一约束兜底（违例以错误冒出）。
 */
export const register = createServerFn({
  method: "POST",
})
  .validator(registerSchema)
  .handler(async ({ data: { name, email, password } }) => {
    setResponseHeader("Cache-Control", "no-store");

    try {
      // 速率限制：同一 IP 1 分钟最多 3 次注册
      const ip = getRequestIP() ?? "unknown";
      const { allowed, resetAt } = await rateLimit("register", ip);
      if (!allowed) {
        setResponseHeader(
          "Retry-After",
          String(Math.ceil((resetAt - Date.now()) / 1000)),
        );
        throw new Error("Too many requests, please try again later");
      }

      const existingUser = await db.orm.public.User.where({ email }).first();
      if (existingUser) {
        throw new Error("User already exists");
      }

      const passwordHash = await hashPassword(password);

      const user = await db.orm.public.User.create({
        email,
        name,
        passwordHash,
        image: DEFAULT_IMAGE,
        bio: DEFAULT_BIO,
      });

      // 创建邮箱验证令牌 + 发邮件（事务外）
      const verificationToken = await createVerificationToken(user.id);
      await sendMail(
        email,
        "验证你的邮箱",
        [
          "请点击下面的链接验证你的邮箱（24 小时内有效）：",
          "",
          `${process.env.APP_URL}/auth/verify-email?token=${verificationToken}`,
          "",
          "如果你没有注册账号，可以安全地忽略这封邮件。",
        ].join("\n"),
      );

      return {
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
      };
    } catch (error) {
      console.error("[Register] Error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Registration failed: ${message}`);
    }
  });
