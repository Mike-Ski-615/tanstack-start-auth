/**
 * getUserFn 集成测试（文档模式）。
 *
 * 门控：仅在设置了 TEST_DATABASE_URL 时运行。
 * 核心回归守卫：返回的用户是公开形态，passwordHash 永不出现；
 * 无会话/篡改会话/用户不存在均返回 null。
 */
import { afterAll, describe, expect, test } from "bun:test";
import type { User } from "../src/server/user.functions";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

// 必须在 db 模块加载前指向测试库
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

const { callServerFn, inRequest, parseSessionToken } =
  await import("./server-fn");
const { db } = await import("../src/prisma/db");
const { useAppSession } = await import("../src/lib/session");
const { getUserFn } = await import("../src/server/user.functions");

const SESSION_COOKIE = "app-session";

describe.skipIf(!TEST_DATABASE_URL)("getUserFn（集成测试）", () => {
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
      await db.orm.public.User.where({ id }).delete();
    }
  });

  /** 为指定 userId 签发一个会话 cookie（直接写会话，绕过登录）。 */
  async function issueCookie(userId: Char<36>): Promise<string> {
    const { setCookieHeader } = await inRequest(async () => {
      const session = await useAppSession();
      await session.update({ userId });
    });
    return parseSessionToken(setCookieHeader!);
  }

  test("无会话 → null", async () => {
    const { result } = await callServerFn<User | null>(getUserFn);
    expect(result).toBeNull();
  });

  test("有效会话 → 公开形态完整", async () => {
    const userId = await createUser();
    const sealed = await issueCookie(userId);

    const { result } = await callServerFn<User | null>(getUserFn, undefined, {
      cookie: `${SESSION_COOKIE}=${sealed}`,
    });

    expect(result).not.toBeNull();
    expect(result!.id).toBe(userId);
    expect(result!.name).toBe("tester");
    expect(result!.image).toBe("/default-user.webp");
    expect(result!.bio).toBe("integration test user");
  });

  test("用户是公开形态：passwordHash 永不出现", async () => {
    const userId = await createUser();
    const sealed = await issueCookie(userId);

    const { result } = await callServerFn<User | null>(getUserFn, undefined, {
      cookie: `${SESSION_COOKIE}=${sealed}`,
    });

    expect(result).not.toBeNull();
    expect("passwordHash" in result!).toBe(false);
    // 公开形态的完整键集，多一个少一个都报红
    expect(Object.keys(result!).sort()).toEqual([
      "bio",
      "email",
      "id",
      "image",
      "name",
    ]);
  });

  test("会话指向不存在的用户 → null", async () => {
    const sealed = await issueCookie(crypto.randomUUID() as Char<36>);

    const { result } = await callServerFn<User | null>(getUserFn, undefined, {
      cookie: `${SESSION_COOKIE}=${sealed}`,
    });

    expect(result).toBeNull();
  });

  test("篡改的会话 cookie → null", async () => {
    const userId = await createUser();
    const sealed = await issueCookie(userId);
    const tampered =
      sealed.slice(0, -1) + (sealed[sealed.length - 1] === "A" ? "B" : "A");

    const { result } = await callServerFn<User | null>(getUserFn, undefined, {
      cookie: `${SESSION_COOKIE}=${tampered}`,
    });

    expect(result).toBeNull();
  });
});
