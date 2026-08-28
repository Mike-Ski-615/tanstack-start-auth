import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";

import { endSession, issueSession } from "./session";
import { sendVerification } from "./verification";
import { hashPassword, verifyPassword } from "../password";

/**
 * 认证用例模块：业务策略住在这里，server functions 只是 HTTP seam 上的薄 adapter。
 *
 * 失败即结果值——失败面是 interface 的一部分，调用方不读实现就知道有哪些失败。
 */

export type AuthenticateResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "email_not_verified" };

export type EnrollResult =
  | { ok: true; user: { id: Char<36>; email: string; name: string } }
  | { ok: false; error: "email_taken" };

/**
 * 登录用例：校验凭据，成功即签发 Session（签发即顶替）。
 *
 * 策略：用户不存在与密码错误返回同一个 invalid_credentials，防账号枚举；
 * 验证是硬门槛——密码正确但邮箱未验证时返回 email_not_verified。
 */
export async function authenticate(
  email: string,
  password: string,
): Promise<AuthenticateResult> {
  const user = await db.orm.public.User.where({ email }).first();

  if (!user) {
    return { ok: false, error: "invalid_credentials" };
  }

  const passwordValid = await verifyPassword(user.passwordHash, password);

  if (!passwordValid) {
    return { ok: false, error: "invalid_credentials" };
  }

  if (user.verifiedAt === null) {
    return { ok: false, error: "email_not_verified" };
  }

  await issueSession(user.id);

  return { ok: true };
}

/**
 * 注册开户用例：创建未验证的 User 并发送验证邮件。
 *
 * 验证是登录的硬门槛，因此注册不再即登录：
 * 用户在邮箱中点击验证链接后才获得第一个 Session（见 verifyEmail）。
 *
 * 策略：邮箱占用双保险——先查重返回 email_taken；并发竞态下
 * 唯一约束违例也捕获并映射为同一个 email_taken。
 */
export async function enroll(
  name: string,
  email: string,
  password: string,
): Promise<EnrollResult> {
  const existingUser = await db.orm.public.User.where({ email }).first();

  if (existingUser) {
    return { ok: false, error: "email_taken" };
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await db.transaction(async (tx) => {
      const user = await tx.orm.public.User.create({
        email,
        name,
        passwordHash,
        image: "/default-user.webp",
        bio: "这个人很懒,什么也没有留下",
      });

      return user;
    });

    await sendVerification(user.id, email);

    return {
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "email_taken" };
    }
    throw error;
  }
}

/**
 * 登出用例：撤销会话并清除 cookie。无失败面（sessionId 来自鉴权中间件）。
 */
export async function signOut(sessionId: Char<36>): Promise<void> {
  await endSession(sessionId);
}

/** Postgres 唯一约束违例（23505）或 Prisma 层映射（P2002）。 */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const e = error as Record<string, unknown>;

  return (
    e.code === "23505" ||
    e.code === "P2002" ||
    (typeof e.message === "string" &&
      /unique|duplicate key/i.test(e.message))
  );
}
