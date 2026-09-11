import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseHeader } from "@tanstack/react-start/server";
import { db } from "#prisma/db";

import { registerSchema } from "#schemas/auth";

import { hashPassword } from "../lib/auth/password";
import { createVerificationOtp } from "#lib/auth/email-verification";
import { sendMail } from "../lib/auth/mail";
import { enforceRateLimit } from "#lib/auth/rate-limiter";

/** 注册表单不含头像/简介，给新用户初始值。 */
const DEFAULT_IMAGE = "/default-user.webp";
const DEFAULT_BIO = "这个人很懒,什么也没有留下";

/**
 * 注册开户用例：查重 → 建 User + EmailVerificationToken → 发验证邮件。
 *
 * 注册 ≠ 登录。注册后用户需点击邮件中的验证链接完成验证，
 * 验证通过后才创建 Session（自动登录）。
 *
 * ## 不暴露「邮箱是否已注册」
 *
 * 邮箱已存在时**不报错**，而是返回与成功一模一样的响应（并给已存在的
 * 邮箱发一封提醒邮件）。原因：直接回「这个邮箱已被注册」等于给攻击者
 * 一个免费的账号枚举接口 —— 拿邮箱列表跑一遍就能筛出哪些人在这里有账号。
 * 注册限速是每 IP 每分钟 3 次，拦不住分布式枚举。
 *
 * 代价：真正的新用户与「邮箱已存在」在老用户看来一样（都跳到验证码页）；
 * 只有查收邮件才能区分（已注册者收到的是提醒而非验证码）。这是业界通行做法。
 *
 * 并发竞态由数据库唯一约束兜底 —— 那种情况也走同一路径，不报错。
 */
export const register = createServerFn({
  method: "POST",
})
  .validator(registerSchema)
  .handler(async ({ data: { name, email, password } }) => {
    setResponseHeader("Cache-Control", "no-store");

    // 速率限制：同一 IP 1 分钟最多 3 次注册
    const ip = getRequestIP();
    await enforceRateLimit("register", { ip });

    /*
     * 两种情况（新建 / 已存在）返回的**形状**必须完全一致，
     * 否则攻击者能靠字段存在性区分。下面两个分支的 return 都对齐这个形状。
     *
     * user.id 在已存在分支里用空串占位（新用户是真实 id）—— 前端只用到
     * email 去跳验证码页，不使用 id，所以空串不影响流程。
     */
    const existingUser = await db.orm.public.User.where({ email }).first();

    if (existingUser) {
      /*
       * 发一封「你已有账号」的提醒邮件。
       *
       * 这不是可选项：不留任何通知的话，真正忘了自己注册过的用户会
       * 卡在验证码页永远等不到邮件。由邮件（而不是接口响应）承担区分职责，
       * 而邮件只有邮箱持有者能看 —— 不会泄漏给攻击者。
       *
       * 失败不抛错（否则响应就与成功不一致了），只记日志。
       */
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

      // 与成功响应同形：user.id 用空串占位（前端只用 email，不使用 id）
      return {
        success: true,
        user: { id: "", email, name },
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

    // 创建邮箱验证 OTP + 发邮件（事务外）
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
      user: { id: user.id, email: user.email, name: user.name },
    };
  });
