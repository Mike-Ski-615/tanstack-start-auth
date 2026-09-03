/**
 * 认证用例集成测试（登录/注册/登出，文档模式）。
 *
 * 门控：仅在设置了 TEST_DATABASE_URL 时运行。
 * 会话为无状态加密 cookie（useAppSession）：
 * - 登录/注册成功 → Set-Cookie 下发密封会话，重放经 getUserFn 验证
 * - 登录成功与登出的 handler 以 throw redirect 结束，
 *   测试侧以 isRedirect 断言（客户端 RPC 同样原样抛回）
 */
import { afterAll, describe, expect, test } from "bun:test";
import { isRedirect } from "@tanstack/react-router";
import type { CurrentUser } from "../src/server/user.functions";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// 必须在 db 模块加载前指向测试库
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

// server-fn 的 mock 必须先于 server function 模块加载
const { callServerFn, inRequest, parseSessionToken } =
  await import("./server-fn");
const { db } = await import("../src/prisma/db");
const { uuid } = await import("../src/prisma/uuid");
const { login } = await import("../src/server/login.functions");
const { register } = await import("../src/server/register.functions");
const { logout } = await import("../src/server/logout.functions");
const { getUserFn } = await import("../src/server/user.functions");
const { hashPassword } = await import("../src/server/password");

const SESSION_COOKIE = "app-session";
const TEST_PASSWORD = "correct-horse-battery";

describe.skipIf(!TEST_DATABASE_URL)("auth 用例（集成测试）", () => {
  const createdUserIds: string[] = [];

  /** 建一个带真实密码哈希的用户，返回 id 与邮箱。 */
  async function createUserWithPassword(
    password: string = TEST_PASSWORD,
  ): Promise<{ id: string; email: string }> {
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
    // Token 外键为 cascade，删用户即清理
    for (const id of createdUserIds) {
      await db.orm.public.User.where({ id: uuid(id) }).delete();
    }
  });

  /** 重放会话 cookie，返回 getUserFn 的结果。 */
  async function whoami(setCookieHeader: string) {
    const sealed = parseSessionToken(setCookieHeader);
    const { result } = await callServerFn<CurrentUser | null>(
      getUserFn,
      undefined,
      {
        cookie: `${SESSION_COOKIE}=${sealed}`,
      },
    );
    return result;
  }

  test("login 凭据正确 → redirect + 会话 cookie 有效", async () => {
    const { id, email } = await createUserWithPassword();

    const { result, error, setCookieHeader } = await callServerFn(login, {
      email,
      password: TEST_PASSWORD,
    });

    expect(result).toBeUndefined();
    expect(isRedirect(error)).toBe(true);
    expect(setCookieHeader).not.toBeNull();

    const user = await whoami(setCookieHeader!);
    expect(user?.id).toBe(id);
    expect(user?.email).toBe(email);
  });

  test("login 密码错误 → 返回 error，无会话 cookie", async () => {
    const { email } = await createUserWithPassword();

    const { result, error, setCookieHeader } = await callServerFn(login, {
      email,
      password: "wrong-password",
    });

    expect(error).toBeUndefined();
    expect(result).toEqual({ error: "Invalid email or password" });
    expect(setCookieHeader).toBeNull();
  });

  test("login 邮箱不存在 → 返回同一 error（防枚举）", async () => {
    const { result, error, setCookieHeader } = await callServerFn(login, {
      email: `nobody-${crypto.randomUUID()}@example.com`,
      password: TEST_PASSWORD,
    });

    expect(error).toBeUndefined();
    expect(result).toEqual({ error: "Invalid email or password" });
    expect(setCookieHeader).toBeNull();
  });

  test("register 新用户 → success + 用户投影 + 即登录", async () => {
    const email = `new-${crypto.randomUUID()}@example.com`;

    const { result, error, setCookieHeader } = await callServerFn<{
      success: true;
      user: { id: string; email: string; name: string };
    }>(register, { name: "新人", email, password: TEST_PASSWORD });

    expect(error).toBeUndefined();
    expect(result?.success).toBe(true);
    expect(result?.user.email).toBe(email);
    expect(result?.user.name).toBe("新人");
    expect(result?.user.id).toBeTruthy();
    createdUserIds.push(result!.user.id);

    // 注册即登录：会话 cookie 随响应下发且真实有效
    expect(setCookieHeader).not.toBeNull();
    const user = await whoami(setCookieHeader!);
    expect(user?.id).toBe(result!.user.id);

    // 默认资料沉入用例：头像与签名已填充
    const row = await db.orm.public.User.where({
      id: uuid(result!.user.id),
    }).first();
    expect(row?.image).toBe("/default-user.webp");
    expect(row?.bio).toBe("这个人很懒,什么也没有留下");
  });

  test("register 邮箱占用 → 返回 error，不产生第二个用户", async () => {
    const { email } = await createUserWithPassword();

    const { result, error } = await callServerFn(register, {
      name: "冒名者",
      email,
      password: TEST_PASSWORD,
    });

    expect(error).toBeUndefined();
    expect(result).toEqual({ error: "User already exists" });

    const users = await db.orm.public.User.where({ email }).all();
    expect(users.length).toBe(1);
  });

  test("register 并发竞态：唯一约束兜底，恰好一人成功", async () => {
    const email = `race-${crypto.randomUUID()}@example.com`;

    // 查重在事务外：多数情况下败者被查重拦下返回 error；
    // 真竞态下则吃到唯一约束违例（同样以 error 返回）
    const [r1, r2] = await Promise.allSettled([
      callServerFn<{ success?: true; error?: string; user?: { id: string } }>(
        register,
        { name: "甲", email, password: TEST_PASSWORD },
      ),
      callServerFn<{ success?: true; error?: string; user?: { id: string } }>(
        register,
        { name: "乙", email, password: TEST_PASSWORD },
      ),
    ]);

    const fulfilled = [r1, r2].filter(
      (
        r,
      ): r is PromiseFulfilledResult<
        Awaited<
          ReturnType<
            typeof callServerFn<{
              success?: true;
              error?: string;
              user?: { id: string };
            }>
          >
        >
      > => r.status === "fulfilled",
    );
    const rejected = [r1, r2].filter((r) => r.status === "rejected");

    const oks = fulfilled.filter((r) => r.value.result?.success);
    const losers = fulfilled.filter(
      (r) => r.value.error !== undefined || r.value.result?.error !== undefined,
    );

    // 恰好一人成功；败者要么被查重拦下，要么在真竞态下吃到唯一约束违例
    expect(oks.length).toBe(1);
    expect(losers.length + rejected.length).toBe(1);

    createdUserIds.push(oks[0]!.value.result!.user!.id);

    const users = await db.orm.public.User.where({ email }).all();
    expect(users.length).toBe(1);
  });

  test("logout → 清除 cookie + 返回 success", async () => {
    const { email } = await createUserWithPassword();

    const { setCookieHeader } = await callServerFn(login, {
      email,
      password: TEST_PASSWORD,
    });
    const sealed = parseSessionToken(setCookieHeader!);

    const { result, error, setCookieHeader: clearHeader } = await callServerFn(
      logout,
      undefined,
      { cookie: `${SESSION_COOKIE}=${sealed}` },
    );

    expect(error).toBeUndefined();
    expect(result).toEqual({ success: true });
    expect(clearHeader).not.toBeNull();
    const attrs = clearHeader!.toLowerCase();
    expect(attrs.includes("max-age=0") || attrs.includes("expires=")).toBe(
      true,
    );

    // 无 cookie 请求 → 未登录
    const { result: anonymous } = await callServerFn<CurrentUser | null>(
      getUserFn,
    );
    expect(anonymous).toBeNull();
  });
});
