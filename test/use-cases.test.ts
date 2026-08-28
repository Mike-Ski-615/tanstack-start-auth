/**
 * 认证用例集成测试（登录/注册/登出）。
 *
 * 门控：仅在设置了 TEST_DATABASE_URL 时运行。
 * 用例已内联进各 server function 的 handler，测试经 callServerFn
 * （__executeServer + runWithStartContext）在真实（最小）请求上下文中运行。
 */
import { afterAll, describe, expect, test } from "bun:test";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// 必须在 db 模块加载前指向测试库
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

// server-fn 的 mock 必须先于 server function 模块加载
const { callServerFn, inRequest, parseSessionToken } = await import(
  "./server-fn"
);
const { db } = await import("../src/prisma/db");
const { login } = await import("../src/server/login.functions");
const { register } = await import("../src/server/register.functions");
const { logout } = await import("../src/server/logout.functions");
const { hashPassword } = await import("../src/server/password");
const { readSession } = await import("../src/server/auth/session");

const SESSION_COOKIE = "__Host-session";
const TEST_PASSWORD = "correct-horse-battery";

describe.skipIf(!TEST_DATABASE_URL)("auth 用例（集成测试）", () => {
  const createdUserIds: Char<36>[] = [];

  /** 建一个带真实密码哈希的用户，返回 id。 */
  async function createUserWithPassword(
    password: string = TEST_PASSWORD,
  ): Promise<{ id: Char<36>; email: string }> {
    const email = `test-${crypto.randomUUID()}@example.com`;
    const user = await db.orm.public.User.create({
      email,
      name: "tester",
      passwordHash: await hashPassword(password),
      image: "/default-user.webp",
      bio: "integration test user",
    });
    createdUserIds.push(user.id);
    return { id: user.id, email };
  }

  afterAll(async () => {
    for (const id of createdUserIds) {
      await db.orm.public.Session.where({ userId: id }).delete();
      await db.orm.public.User.where({ id: id }).delete();
    }
  });

  test("login 凭据正确 → ok + 活跃会话", async () => {
    const { email } = await createUserWithPassword();

    const { result, error, setCookieHeader } = await callServerFn(login, {
      email,
      password: TEST_PASSWORD,
    });

    expect(error).toBeUndefined();
    expect(result).toEqual({ ok: true });
    expect(setCookieHeader).not.toBeNull();

    const token = parseSessionToken(setCookieHeader!);
    const { result: session } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${token}`,
    });
    expect(session).not.toBeNull();
    createdUserIds.push(session!.userId);
  });

  test("login 密码错误 → 抛错，无会话", async () => {
    const { email } = await createUserWithPassword();

    const { result, error, setCookieHeader } = await callServerFn(login, {
      email,
      password: "wrong-password",
    });

    expect(result).toBeUndefined();
    expect(error?.message).toBe("Invalid email or password");
    expect(setCookieHeader).toBeNull();
  });

  test("login 邮箱不存在 → 同样抛同一错误（防枚举）", async () => {
    const { result, error, setCookieHeader } = await callServerFn(login, {
      email: `nobody-${crypto.randomUUID()}@example.com`,
      password: TEST_PASSWORD,
    });

    expect(result).toBeUndefined();
    expect(error?.message).toBe("Invalid email or password");
    expect(setCookieHeader).toBeNull();
  });

  test("register 新用户 → ok + 用户投影 + 即登录", async () => {
    const email = `new-${crypto.randomUUID()}@example.com`;

    const {
      result,
      error,
      setCookieHeader,
    } = await callServerFn<{
      ok: true;
      user: { id: Char<36>; email: string; name: string };
    }>(register, { name: "新人", email, password: TEST_PASSWORD });

    expect(error).toBeUndefined();
    expect(result?.ok).toBe(true);
    expect(result?.user.email).toBe(email);
    expect(result?.user.name).toBe("新人");
    expect(result?.user.id).toBeTruthy();
    createdUserIds.push(result!.user.id);

    // 注册即登录：Session 随响应下发且真实有效
    expect(setCookieHeader).not.toBeNull();
    const token = parseSessionToken(setCookieHeader!);
    const { result: session } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${token}`,
    });
    expect(session?.userId).toBe(result!.user.id);

    // 默认资料沉入用例：头像与签名已填充
    const user = await db.orm.public.User.where({ id: result!.user.id }).first();
    expect(user?.image).toBe("/default-user.webp");
    expect(user?.bio).toBe("这个人很懒,什么也没有留下");
  });

  test("register 邮箱占用 → 抛错，不产生第二个用户", async () => {
    const { email } = await createUserWithPassword();

    const { result, error } = await callServerFn(register, {
      name: "冒名者",
      email,
      password: TEST_PASSWORD,
    });

    expect(result).toBeUndefined();
    expect(error?.message).toBe("Unable to create account");

    const users = await db.orm.public.User.where({ email }).all();
    expect(users.length).toBe(1);
  });

  test("register 并发竞态：唯一约束兜底，恰好一人成功", async () => {
    const email = `race-${crypto.randomUUID()}@example.com`;

    // 查重在事务外：多数情况下败者被查重拦下抛错；
    // 真竞态下则吃到唯一约束违例（同样以 error 返回）
    const [r1, r2] = await Promise.allSettled([
      callServerFn<{ ok: true; user: { id: Char<36> } }>(register, {
        name: "甲",
        email,
        password: TEST_PASSWORD,
      }),
      callServerFn<{ ok: true; user: { id: Char<36> } }>(register, {
        name: "乙",
        email,
        password: TEST_PASSWORD,
      }),
    ]);

    const fulfilled = [r1, r2].filter(
      (r): r is PromiseFulfilledResult<
        Awaited<ReturnType<typeof callServerFn<{ ok: true; user: { id: Char<36> } }>>>
      > => r.status === "fulfilled",
    );
    const rejected = [r1, r2].filter((r) => r.status === "rejected");

    const oks = fulfilled.filter((r) => r.value.result?.ok);
    const losers = fulfilled.filter((r) => r.value.error !== undefined);

    // 恰好一人成功；败者要么被查重拦下，要么在真竞态下吃到唯一约束违例
    expect(oks.length).toBe(1);
    expect(losers.length + rejected.length).toBe(1);

    createdUserIds.push(oks[0]!.value.result!.user.id);

    const users = await db.orm.public.User.where({ email }).all();
    expect(users.length).toBe(1);
  });

  test("logout 撤销会话并清除 cookie", async () => {
    const { email } = await createUserWithPassword();

    const { setCookieHeader } = await callServerFn(login, {
      email,
      password: TEST_PASSWORD,
    });
    const token = parseSessionToken(setCookieHeader!);
    const { result: session } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${token}`,
    });
    expect(session).not.toBeNull();

    const { result, error, setCookieHeader: clearHeader } = await callServerFn(
      logout,
      undefined,
      { cookie: `${SESSION_COOKIE}=${token}` },
    );

    expect(error).toBeUndefined();
    expect(result).toEqual({ ok: true });

    const row = await db.orm.public.Session.where({ id: session!.id }).first();
    expect(row!.revokedAt).not.toBeNull();

    expect(clearHeader).not.toBeNull();
    const attrs = clearHeader!.toLowerCase();
    expect(attrs.includes("max-age=0") || attrs.includes("expires=")).toBe(
      true,
    );
  });
});
