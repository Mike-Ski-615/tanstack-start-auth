/**
 * 密码重置集成测试（无状态版）。
 *
 * 门控：仅在设置了 TEST_DATABASE_URL 时运行。
 * 用例已内联进各 server function 的 handler，测试经 callServerFn
 * （__executeServer + runWithStartContext）在最小请求上下文中运行。
 * 重置令牌的获取：测试内捕获 console（sendMail 的控制台实现），
 * 从邮件正文中提取链接里的 token；为自包含 HMAC 签名串，不落库。
 *
 * 会话语义（无状态加密 cookie）：重置成功下发新会话 cookie 自动登录；
 * 旧会话 cookie 无法服务端撤销，自然过期前仍然有效。
 */
import { afterAll, describe, expect, test } from "bun:test";
import type { User } from "../src/server/user.functions";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// 必须在 db 模块加载前指向测试库
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

// server-fn 的 mock 必须先于 server function 模块加载
const { callServerFn, parseSessionToken } = await import("./server-fn");
const { db } = await import("../src/prisma/db");
const { login } = await import("../src/server/login.functions");
const { requestPasswordResetFn, resetPasswordFn } =
  await import("../src/server/reset.functions");
const { getUserFn } = await import("../src/server/user.functions");
const { hashPassword } = await import("../src/server/password");

const SESSION_COOKIE = "app-session";
const TEST_PASSWORD = "correct-horse-battery";

/** 捕获 sendMail 的控制台输出。 */
async function captureMail<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; mail: string }> {
  const chunks: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    chunks.push(args.map(String).join(" "));
  };
  try {
    const result = await fn();
    return { result, mail: chunks.join("\n") };
  } finally {
    console.log = original;
  }
}

function extractToken(mail: string): string {
  const match = mail.match(/token=([^&\s]+)/);
  if (!match) throw new Error("邮件中没有找到令牌链接");
  return match[1]!;
}

describe.skipIf(!TEST_DATABASE_URL)("密码重置（集成测试）", () => {
  const createdUserIds: Char<36>[] = [];

  function uniqueEmail(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}@example.com`;
  }

  /** 建一个带真实密码哈希的用户并返回邮箱。 */
  async function createUser(password: string = TEST_PASSWORD): Promise<string> {
    const email = uniqueEmail("reset");
    const user = await db.orm.public.User.create({
      email,
      name: "tester",
      passwordHash: await hashPassword(password),
      image: "/default-user.webp",
      bio: "reset test user",
    });
    createdUserIds.push(user.id);
    return email;
  }

  afterAll(async () => {
    for (const id of createdUserIds) {
      await db.orm.public.User.where({ id }).delete();
    }
  });

  /** 重放 Set-Cookie 中的会话，返回 getUserFn 的结果。 */
  async function whoami(setCookieHeader: string) {
    const sealed = parseSessionToken(setCookieHeader);
    const { result } = await callServerFn<User | null>(
      getUserFn,
      undefined,
      {
        cookie: `${SESSION_COOKIE}=${sealed}`,
      },
    );
    return result;
  }

  test("requestPasswordResetFn 防枚举：存在与否恒同响应", async () => {
    const knownEmail = await createUser();

    const { result: forKnown } = await callServerFn(requestPasswordResetFn, {
      email: knownEmail,
    });
    const { result: forUnknown } = await callServerFn(requestPasswordResetFn, {
      email: uniqueEmail("unknown"),
    });

    expect(forKnown).toEqual({ ok: true });
    expect(forUnknown).toEqual({ ok: true });
  });

  test("resetPasswordFn 成功 → 改密 + 自动登录", async () => {
    const email = await createUser();

    // 先登录，制造一个旧会话 cookie
    const { setCookieHeader: oldCookie } = await callServerFn(login, {
      email,
      password: TEST_PASSWORD,
    });

    // 发起重置并消费令牌
    const { mail: resetMail } = await captureMail(() =>
      callServerFn(requestPasswordResetFn, { email }),
    );
    const resetToken = extractToken(resetMail);

    const newPassword = "brand-new-password";
    const {
      result,
      error,
      setCookieHeader: newCookie,
    } = await callServerFn(resetPasswordFn, {
      token: resetToken,
      password: newPassword,
    });
    expect(error).toBeUndefined();
    expect(result).toEqual({ ok: true });

    // 自动登录的新会话有效
    expect(newCookie).not.toBeNull();
    const newUser = await whoami(newCookie!);
    expect(newUser?.email).toBe(email);

    // 无状态会话的服务端不可撤销性：旧 cookie 在过期前仍然有效
    // （这是文档模式的已知取舍，原“签发即顶替”语义不复存在）
    const oldUser = await whoami(oldCookie!);
    expect(oldUser).not.toBeNull();

    // 旧密码失效：抛错（防枚举文案），无新会话
    const { result: oldPassword, error: oldPasswordError } = await callServerFn(
      login,
      { email, password: TEST_PASSWORD },
    );
    expect(oldPassword).toBeUndefined();
    expect(oldPasswordError?.message).toBe("Invalid email or password");

    // 新密码生效：登录成功返回 success 并下发新会话
    const {
      result: newLogin,
      error: newLoginError,
      setCookieHeader: newPasswordCookie,
    } = await callServerFn(login, { email, password: newPassword });
    expect(newLoginError).toBeUndefined();
    expect(newLogin).toEqual({ success: true });
    expect(newPasswordCookie).not.toBeNull();
  });

  test("resetPasswordFn 有效期内令牌可重放（无状态取舍）", async () => {
    const email = await createUser();

    const { mail } = await captureMail(() =>
      callServerFn(requestPasswordResetFn, { email }),
    );
    const token = extractToken(mail);

    // 无状态令牌丢弃“一次性”：同一链接在 TTL 内可再次成功
    const { result: first } = await callServerFn(resetPasswordFn, {
      token,
      password: "first-reset-123",
    });
    expect(first).toEqual({ ok: true });

    const { result: second, error: secondError } = await callServerFn(
      resetPasswordFn,
      { token, password: "second-reset-123" },
    );
    expect(secondError).toBeUndefined();
    expect(second).toEqual({ ok: true });
  });

  test("resetPasswordFn 篡改令牌 → invalid_token（验签兜底）", async () => {
    const email = await createUser();

    const { mail } = await captureMail(() =>
      callServerFn(requestPasswordResetFn, { email }),
    );
    const token = extractToken(mail);
    // 篡改载荷段（JWT 中段）而不动签名 → 验签必失败
    const [header, payload, signature] = token.split(".");
    const flippedPayload =
      payload![0] === "e" ? "f" + payload!.slice(1) : "e" + payload!.slice(1);
    const tampered = `${header}.${flippedPayload}.${signature}`;

    const { error, setCookieHeader } = await callServerFn(resetPasswordFn, {
      token: tampered,
      password: "whatever-123",
    });
    expect(error).toBeDefined();
    expect(error?.message).toBe("invalid_token");
    expect(setCookieHeader).toBeNull();
  });

  test("resetPasswordFn 无效令牌 → invalid_token", async () => {
    const { error } = await callServerFn(resetPasswordFn, {
      token: "garbage-token",
      password: "whatever-123",
    });
    expect(error).toBeDefined();
    expect(error?.message).toBe("invalid_token");
  });
});
