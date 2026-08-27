/**
 * Session module 集成测试。
 *
 * 门控：仅在设置了 TEST_DATABASE_URL 时运行（指向独立测试库，勿用开发库）。
 * 所有公开 interface 的调用都通过 requestHandler 包裹，在真实（最小）
 * 请求上下文中跨越同一条 seam——cookie 传输边缘也在断言范围内。
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
  issueSession,
  readSession,
  endSession,
} = await import("../src/server/auth/session");
const { hashSessionToken } = await import("../src/server/auth/session.core");
const {
  requestHandler,
  getResponseHeader,
} = await import("@tanstack/react-start/server");

const SESSION_COOKIE = "__Host-session";
const SEVEN_DAYS = 7 * 24 * 60 * 60;

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

/** 从 Set-Cookie 头中解析出令牌值。 */
function parseSessionToken(setCookieHeader: string): string {
  const pair = setCookieHeader.split(";")[0]!;
  return pair.slice(pair.indexOf("=") + 1);
}

describe.skipIf(!TEST_DATABASE_URL)("session module（集成测试）", () => {
  const createdUserIds: Char<36>[] = [];

  async function createUser(): Promise<Char<36>> {
    const user = await db.orm.public.User.create({
      email: `test-${crypto.randomUUID()}@example.com`,
      name: "tester",
      passwordHash: "not-a-real-hash",
      image: "/default-user.webp",
      bio: "integration test user",
    });
    createdUserIds.push(user.id);
    return user.id;
  }

  afterAll(async () => {
    for (const id of createdUserIds) {
      await db.orm.public.Session.where({ userId: id }).delete();
      await db.orm.public.User.where({ id: id }).delete();
    }
  });

  test("issueSession 创建活跃会话并写入 cookie", async () => {
    const userId = await createUser();

    const { setCookieHeader } = await inRequest(() => issueSession(userId));

    expect(setCookieHeader).not.toBeNull();
    const attrs = setCookieHeader!.toLowerCase();
    expect(attrs).toContain(`${SESSION_COOKIE.toLowerCase()}=`);
    expect(attrs).toContain("httponly");
    expect(attrs).toContain("secure");
    expect(attrs).toContain("samesite=lax");
    expect(attrs).toContain("path=/");
    expect(attrs).toContain(`max-age=${SEVEN_DAYS}`);

    const rows = await db.orm.public.Session.where({ userId }).all();
    expect(rows.length).toBe(1);
    expect(rows[0]!.revokedAt).toBeNull();
  });

  test("issueSession 顶替：再次签发撤销全部旧会话", async () => {
    const userId = await createUser();

    await inRequest(() => issueSession(userId));
    await inRequest(() => issueSession(userId));

    const rows = await db.orm.public.Session.where({ userId }).all();
    expect(rows.length).toBe(2);
    expect(rows.filter((r) => r.revokedAt === null).length).toBe(1);
  });

  test("issueSession(userId, tx) 参与调用方事务：回滚则无会话", async () => {
    const userId = await createUser();

    await inRequest(async () => {
      try {
        await db.transaction(async (tx) => {
          await issueSession(userId, tx);
          throw new Error("force rollback");
        });
      } catch {
        // 预期中的回滚
      }
    });

    const rows = await db.orm.public.Session.where({ userId }).all();
    expect(rows.length).toBe(0);
  });

  test("readSession 校验 cookie", async () => {
    const userId = await createUser();

    // 无 cookie → null
    const { result: noCookie } = await inRequest(() => readSession());
    expect(noCookie).toBeNull();

    // 有效 cookie → 会话行
    const { setCookieHeader } = await inRequest(() => issueSession(userId));
    const token = parseSessionToken(setCookieHeader!);
    const cookie = `${SESSION_COOKIE}=${token}`;

    const { result: valid } = await inRequest(() => readSession(), { cookie });
    expect(valid?.userId).toBe(userId);

    // 垃圾 cookie → null
    const { result: garbage } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=garbage-token`,
    });
    expect(garbage).toBeNull();

    // 已撤销 → null
    await inRequest(() => endSession(valid!.id));
    const { result: revoked } = await inRequest(() => readSession(), { cookie });
    expect(revoked).toBeNull();

    // 已过期 → null
    const expiredToken = `expired-${crypto.randomUUID()}`;
    await db.orm.public.Session.create({
      tokenHash: hashSessionToken(expiredToken),
      userId,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const { result: expired } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${expiredToken}`,
    });
    expect(expired).toBeNull();
  });

  test("endSession 撤销会话并清除 cookie", async () => {
    const userId = await createUser();

    const { setCookieHeader } = await inRequest(() => issueSession(userId));
    const token = parseSessionToken(setCookieHeader!);
    const { result: session } = await inRequest(() => readSession(), {
      cookie: `${SESSION_COOKIE}=${token}`,
    });
    expect(session).not.toBeNull();

    const { setCookieHeader: clearHeader } = await inRequest(() =>
      endSession(session!.id),
    );

    const row = await db.orm.public.Session.where({ id: session!.id }).first();
    expect(row!.revokedAt).not.toBeNull();

    expect(clearHeader).not.toBeNull();
    const attrs = clearHeader!.toLowerCase();
    expect(attrs).toContain(SESSION_COOKIE.toLowerCase());
    expect(attrs.includes("max-age=0") || attrs.includes("expires=")).toBe(
      true,
    );
  });
});
