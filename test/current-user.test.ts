/**
 * CurrentUser 模块集成测试。
 *
 * 门控：仅在设置了 TEST_DATABASE_URL 时运行。
 * 核心回归守卫：返回的 user 是公开形态，passwordHash 永不出现在其中。
 */
import { afterAll, describe, expect, test } from "bun:test";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// 必须在 db 模块加载前指向测试库
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const { db } = await import("../src/prisma/db");
const { issueSession } = await import("../src/server/auth/session");
const { getCurrentUser } = await import("../src/server/auth/current-user");
const {
  requestHandler,
  getResponseHeader,
} = await import("@tanstack/react-start/server");

const SESSION_COOKIE = "__Host-session";

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

describe.skipIf(!TEST_DATABASE_URL)("CurrentUser 模块（集成测试）", () => {
  const createdUserIds: Char<36>[] = [];

  async function createUser(): Promise<Char<36>> {
    const user = await db.orm.public.User.create({
      email: `test-${crypto.randomUUID()}@example.com`,
      name: "tester",
      passwordHash: "secret-hash-that-must-never-leak",
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

  test("无会话 → null", async () => {
    const { result } = await inRequest(() => getCurrentUser());
    expect(result).toBeNull();
  });

  test("有效会话 → { session, user } 形态完整", async () => {
    const userId = await createUser();

    const { setCookieHeader } = await inRequest(() => issueSession(userId));
    const token = parseSessionToken(setCookieHeader!);

    const { result } = await inRequest(() => getCurrentUser(), {
      cookie: `${SESSION_COOKIE}=${token}`,
    });

    expect(result).not.toBeNull();
    expect(result!.user.id).toBe(userId);
    expect(result!.user.name).toBe("tester");
    expect(result!.user.image).toBe("/default-user.webp");
    expect(result!.user.bio).toBe("integration test user");
    expect(result!.session.userId).toBe(userId);
  });

  test("user 是公开形态：passwordHash 永不出现", async () => {
    const userId = await createUser();

    const { setCookieHeader } = await inRequest(() => issueSession(userId));
    const token = parseSessionToken(setCookieHeader!);

    const { result } = await inRequest(() => getCurrentUser(), {
      cookie: `${SESSION_COOKIE}=${token}`,
    });

    expect(result).not.toBeNull();
    expect("passwordHash" in result!.user).toBe(false);
    // 公开形态的完整键集，多一个少一个都报红
    expect(Object.keys(result!.user).sort()).toEqual([
      "bio",
      "email",
      "id",
      "image",
      "name",
    ]);
  });
});
