/**
 * 认证用例模块集成测试。
 *
 * 门控：仅在设置了 TEST_DATABASE_URL 时运行。
 * 用例通过 issueSession 间接写 cookie，因此与 session 测试一样
 * 用 requestHandler 包裹，在真实（最小）请求上下文中运行。
 */
import { afterAll, describe, expect, test } from "bun:test";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// 必须在 db 模块加载前指向测试库
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const { db } = await import("../src/prisma/db");
const {
  authenticate,
  enroll,
  signOut,
} = await import("../src/server/auth/use-cases");
const { hashPassword } = await import("../src/server/password");
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

function parseSessionToken(setCookieHeader: string): string {
  const pair = setCookieHeader.split(";")[0]!;
  return pair.slice(pair.indexOf("=") + 1);
}

describe.skipIf(!TEST_DATABASE_URL)("auth 用例（集成测试）", () => {
  const createdUserIds: Char<36>[] = [];

  /** 建一个带真实密码哈希的已验证用户，返回 id。 */
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
      verifiedAt: new Date().toISOString(),
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

  test("authenticate 凭据正确 → ok + 活跃会话", async () => {
    const { email } = await createUserWithPassword();

    const { result, setCookieHeader } = await inRequest(() =>
      authenticate(email, TEST_PASSWORD),
    );

    expect(result).toEqual({ ok: true });
    expect(setCookieHeader).not.toBeNull();

    const token = parseSessionToken(setCookieHeader!);
    const { result: session } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${token}`,
    });
    expect(session).not.toBeNull();
    createdUserIds.push(session!.userId);
  });

  test("authenticate 密码错误 → invalid_credentials，无会话", async () => {
    const { email } = await createUserWithPassword();

    const { result, setCookieHeader } = await inRequest(() =>
      authenticate(email, "wrong-password"),
    );

    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
    expect(setCookieHeader).toBeNull();
  });

  test("authenticate 邮箱不存在 → 同样是 invalid_credentials（防枚举）", async () => {
    const { result, setCookieHeader } = await inRequest(() =>
      authenticate(`nobody-${crypto.randomUUID()}@example.com`, TEST_PASSWORD),
    );

    expect(result).toEqual({ ok: false, error: "invalid_credentials" });
    expect(setCookieHeader).toBeNull();
  });

  test("authenticate 邮箱未验证 → email_not_verified（硬门槛）", async () => {
    const email = `unverified-${crypto.randomUUID()}@example.com`;
    const user = await db.orm.public.User.create({
      email,
      name: "unverified",
      passwordHash: await hashPassword(TEST_PASSWORD),
      image: "/default-user.webp",
      bio: "unverified user",
    });
    createdUserIds.push(user.id);

    const { result, setCookieHeader } = await inRequest(() =>
      authenticate(email, TEST_PASSWORD),
    );

    expect(result).toEqual({ ok: false, error: "email_not_verified" });
    expect(setCookieHeader).toBeNull();
  });

  test("enroll 新用户 → ok + 用户投影 + 等待验证（不再即登录）", async () => {
    const email = `new-${crypto.randomUUID()}@example.com`;

    const { result, setCookieHeader } = await inRequest(() =>
      enroll("新人", email, TEST_PASSWORD),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe("新人");
    expect(result.user.id).toBeTruthy();
    createdUserIds.push(result.user.id);

    // 硬门槛：注册不签发 Session，用户处于未验证状态
    expect(setCookieHeader).toBeNull();
    const user = await db.orm.public.User.where({ id: result.user.id }).first();
    expect(user?.verifiedAt).toBeNull();

    // 默认资料沉入用例：头像与签名已填充
    expect(user?.image).toBe("/default-user.webp");
    expect(user?.bio).toBe("这个人很懒,什么也没有留下");
  });

  test("enroll 邮箱占用 → email_taken，不产生第二个用户", async () => {
    const { email } = await createUserWithPassword();

    const { result } = await inRequest(() =>
      enroll("冒名者", email, TEST_PASSWORD),
    );

    expect(result).toEqual({ ok: false, error: "email_taken" });

    const users = await db.orm.public.User.where({ email }).all();
    expect(users.length).toBe(1);
  });

  test("enroll 并发竞态：唯一约束兜底，恰好一人成功", async () => {
    const email = `race-${crypto.randomUUID()}@example.com`;

    const [r1, r2] = await Promise.all([
      inRequest(() => enroll("甲", email, TEST_PASSWORD)),
      inRequest(() => enroll("乙", email, TEST_PASSWORD)),
    ]);

    const results = [r1.result, r2.result];
    const oks = results.filter((r) => r.ok);
    const taken = results.filter((r) => !r.ok);

    expect(oks.length).toBe(1);
    expect(taken.length).toBe(1);
    expect(taken[0]).toEqual({ ok: false, error: "email_taken" });

    if (!oks[0]!.ok) throw new Error("expected ok");
    createdUserIds.push(oks[0]!.user.id);

    const users = await db.orm.public.User.where({ email }).all();
    expect(users.length).toBe(1);
  });

  test("signOut 撤销会话并清除 cookie", async () => {
    const { email } = await createUserWithPassword();

    const { setCookieHeader } = await inRequest(() =>
      authenticate(email, TEST_PASSWORD),
    );
    const token = parseSessionToken(setCookieHeader!);
    const { result: session } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${token}`,
    });
    expect(session).not.toBeNull();

    const { setCookieHeader: clearHeader } = await inRequest(() =>
      signOut(session!.id),
    );

    const row = await db.orm.public.Session.where({ id: session!.id }).first();
    expect(row!.revokedAt).not.toBeNull();

    expect(clearHeader).not.toBeNull();
    const attrs = clearHeader!.toLowerCase();
    expect(attrs.includes("max-age=0") || attrs.includes("expires=")).toBe(
      true,
    );
  });
});
