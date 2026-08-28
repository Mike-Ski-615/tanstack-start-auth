/**
 * 验证模块集成测试：注册邮箱验证 + 密码重置闭环。
 *
 * 门控：仅在设置了 TEST_DATABASE_URL 时运行。
 * 邮件令牌的获取：测试内捕获 console（sendMail 的控制台实现），
 * 从邮件正文中提取链接里的 token。
 */
import { afterAll, describe, expect, test } from "bun:test";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// 必须在 db 模块加载前指向测试库
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const { db } = await import("../src/prisma/db");
const { enroll, authenticate } = await import("../src/server/auth/use-cases");
const {
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
} = await import("../src/server/auth/verification");
const { readSession } = await import("../src/server/auth/session");
const {
  requestHandler,
  getResponseHeader,
} = await import("@tanstack/react-start/server");

const SESSION_COOKIE = "__Host-session";
const TEST_PASSWORD = "correct-horse-battery";

/** 在最小请求上下文中执行 fn，捕获结果与 Set-Cookie 响应头。 */
async function inRequest<T>(
  fn: () => Promise<T>,
  opts?: { cookie?: string },
): Promise<{ result: T; setCookieHeader: string | null }> {
  let captured: { result: T; setCookieHeader: string | null } | undefined;

  const handle = requestHandler(async () => {
    const result = await fn();
    captured = {
      result,
      setCookieHeader: getResponseHeader("Set-Cookie") ?? null,
    };
    return new Response(null);
  });

  const headers = new Headers();
  if (opts?.cookie) headers.set("cookie", opts.cookie);
  await handle(new Request("http://localhost/", { headers }), undefined);

  if (!captured) throw new Error("request handler did not run");
  return captured;
}

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
  const match = mail.match(/token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("邮件中没有找到令牌链接");
  return match[1]!;
}

function parseSessionToken(setCookieHeader: string): string {
  const pair = setCookieHeader.split(";")[0]!;
  return pair.slice(pair.indexOf("=") + 1);
}

describe.skipIf(!TEST_DATABASE_URL)("验证闭环（集成测试）", () => {
  const createdUserIds: Char<36>[] = [];

  function uniqueEmail(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}@example.com`;
  }

  /** enroll 一个新用户并返回验证令牌（从捕获的邮件中提取）。 */
  async function enrollAndCapture(name: string, email: string) {
    const { result, mail } = await captureMail(() =>
      inRequest(() => enroll(name, email, TEST_PASSWORD)),
    );
    if (!result.result.ok) throw new Error("enroll failed");
    createdUserIds.push(result.result.user.id);
    return { enrollResult: result.result, token: extractToken(mail) };
  }

  afterAll(async () => {
    for (const id of createdUserIds) {
      // Token/Session 外键均为 cascade，删用户即清理
      await db.orm.public.User.where({ id: id }).delete();
    }
  });

  test("闭环前半段：注册 → 未验证状态 → 登录被硬门槛拦截", async () => {
    const email = uniqueEmail("loop");

    // 注册：不再即登录，无 cookie 下发
    const { result: enrolled } = await inRequest(() =>
      enroll("闭环", email, TEST_PASSWORD),
    );
    expect(enrolled.ok).toBe(true);
    if (!enrolled.ok) throw new Error("expected ok");
    createdUserIds.push(enrolled.user.id);

    const user = await db.orm.public.User.where({ id: enrolled.user.id }).first();
    expect(user?.verifiedAt).toBeNull();

    // 未验证登录 → email_not_verified
    const { result: blocked } = await inRequest(() =>
      authenticate(email, TEST_PASSWORD),
    );
    expect(blocked).toEqual({ ok: false, error: "email_not_verified" });
  });

  test("verifyEmail 有效令牌 → verified + 自动登录", async () => {
    const email = uniqueEmail("verify");
    const { token } = await enrollAndCapture("验证", email);

    const { result, setCookieHeader } = await inRequest(() =>
      verifyEmail(token),
    );

    expect(result).toEqual({ ok: true });
    expect(setCookieHeader).not.toBeNull();

    // 自动登录的会话真实有效（先验证会话，再走 authenticate——
    // 否则签发即顶替会撤销这个自动登录会话）
    const sessionToken = parseSessionToken(setCookieHeader!);
    const { result: session } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${sessionToken}`,
    });
    expect(session).not.toBeNull();
    createdUserIds.push(session!.userId);

    // 验证后可正常登录
    const { result: authed } = await inRequest(() =>
      authenticate(email, TEST_PASSWORD),
    );
    expect(authed).toEqual({ ok: true });
  });

  test("verifyEmail 已用令牌 → invalid_token（一次性）", async () => {
    const email = uniqueEmail("reuse");
    const { token } = await enrollAndCapture("一次性", email);

    const { result: first } = await inRequest(() => verifyEmail(token));
    expect(first).toEqual({ ok: true });

    const { result: second, setCookieHeader } = await inRequest(() =>
      verifyEmail(token),
    );
    expect(second).toEqual({ ok: false, error: "invalid_token" });
    expect(setCookieHeader).toBeNull();
  });

  test("verifyEmail 垃圾令牌 → invalid_token", async () => {
    const { result } = await inRequest(() => verifyEmail("garbage-token"));
    expect(result).toEqual({ ok: false, error: "invalid_token" });
  });

  test("重发：冷却期内静默跳过，令牌不变", async () => {
    const email = uniqueEmail("cooldown");
    const { token } = await enrollAndCapture("冷却", email);

    const before = await db.orm.public.Token.where({
      purpose: "verify_email",
    }).all();

    // 刚注册完立即重发 → 60s 冷却期内
    const { result } = await inRequest(() => resendVerification(email));
    expect(result).toEqual({ ok: true });

    const after = await db.orm.public.Token.where({
      purpose: "verify_email",
    }).all();
    expect(after.length).toBe(before.length);

    // 原令牌仍然有效
    const { result: verified } = await inRequest(() => verifyEmail(token));
    expect(verified).toEqual({ ok: true });
  });

  test("重发：冷却期后新令牌作废旧令牌（单一性）", async () => {
    const email = uniqueEmail("supersede");
    const { token: oldToken } = await enrollAndCapture("作废旧", email);

    const user = await db.orm.public.User.where({ email }).first();

    // 把 lastSentAt 拨到 2 分钟前，绕过冷却
    await db.orm.public.Token.where({ userId: user!.id }).update({
      lastSentAt: new Date(Date.now() - 120_000).toISOString(),
    });

    const { mail } = await captureMail(() =>
      inRequest(() => resendVerification(email)),
    );
    const newToken = extractToken(mail);
    expect(newToken).not.toBe(oldToken);

    // 旧令牌已死，新令牌可用
    const { result: oldResult } = await inRequest(() => verifyEmail(oldToken));
    expect(oldResult).toEqual({ ok: false, error: "invalid_token" });

    const { result: newResult } = await inRequest(() => verifyEmail(newToken));
    expect(newResult).toEqual({ ok: true });
  });

  test("requestPasswordReset 防枚举：存在与否恒同响应", async () => {
    const knownEmail = uniqueEmail("known");
    await enrollAndCapture("已知", knownEmail);

    const { result: forKnown } = await inRequest(() =>
      requestPasswordReset(knownEmail),
    );
    const { result: forUnknown } = await inRequest(() =>
      requestPasswordReset(uniqueEmail("unknown")),
    );

    expect(forKnown).toEqual({ ok: true });
    expect(forUnknown).toEqual({ ok: true });
  });

  test("resetPassword 成功 → 改密 + 蕴含验证 + 旧会话全撤 + 自动登录", async () => {
    const email = uniqueEmail("reset");
    const { enrollResult } = await enrollAndCapture("重置", email);
    const userId = enrollResult.user.id;

    // 先验证邮箱并登录，制造一个活跃旧会话
    const { mail: verifyMail } = await captureMail(async () => {
      await db.orm.public.Token.where({ userId }).update({
        lastSentAt: new Date(Date.now() - 120_000).toISOString(),
      });
      return inRequest(() => resendVerification(email));
    });
    const verifyToken = extractToken(verifyMail);
    const { setCookieHeader: oldCookie } = await inRequest(() =>
      verifyEmail(verifyToken),
    );
    const oldSessionToken = parseSessionToken(oldCookie!);

    // 发起重置并消费令牌
    const { mail: resetMail } = await captureMail(() =>
      inRequest(() => requestPasswordReset(email)),
    );
    const resetToken = extractToken(resetMail);

    const newPassword = "brand-new-password";
    const { result, setCookieHeader: newCookie } = await inRequest(() =>
      resetPassword(resetToken, newPassword),
    );
    expect(result).toEqual({ ok: true });

    // 旧会话被签发即顶替撤销
    const { result: oldSession } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${oldSessionToken}`,
    });
    expect(oldSession).toBeNull();

    // 自动登录的新会话有效（先于任何 authenticate 调用验证，
    // 否则 authenticate 的签发即顶替会撤销它）
    const newSessionToken = parseSessionToken(newCookie!);
    const { result: newSession } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${newSessionToken}`,
    });
    expect(newSession?.userId).toBe(userId);

    // 旧密码失效，新密码生效（authenticate 会再次顶替，无妨——断言已完成）
    const { result: oldPassword } = await inRequest(() =>
      authenticate(email, TEST_PASSWORD),
    );
    expect(oldPassword).toEqual({ ok: false, error: "invalid_credentials" });

    const { result: newPasswordLogin } = await inRequest(() =>
      authenticate(email, newPassword),
    );
    expect(newPasswordLogin).toEqual({ ok: true });
  });

  test("resetPassword 无效令牌 → invalid_token", async () => {
    const { result } = await inRequest(() =>
      resetPassword("garbage-token", "whatever-123"),
    );
    expect(result).toEqual({ ok: false, error: "invalid_token" });
  });
});
