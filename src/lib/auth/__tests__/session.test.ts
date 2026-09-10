import "#test/mock-server-env";
import { describe, it, expect, afterEach } from "vitest";
import { validateSession } from "#lib/auth/session-manager";
import { db } from "#prisma/db";
import { createUser, deleteUser } from "#test/helpers";

/**
 * 会话校验（守卫核心）测试。
 *
 * 为什么不通过 getUserFn 测：serverFn 的客户端存根在返回 null 时会崩
 * （Cannot read properties of null），测不出「返回 null」这个语义。
 * validateSession 才是守卫的真正核心，直接测它更准确。
 */

const created: string[] = [];

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

async function makeSession(verified = true) {
  const { user, email } = await createUser({ verified });
  created.push(user.id);
  const { createAuthenticatedSession } =
    await import("#lib/auth/session-manager");
  const { token } = await createAuthenticatedSession({
    userId: user.id,
    userAgent: "vitest",
    ip: "192.0.2.10",
  });
  return { user, email, token };
}

describe("validateSession — 有效会话", () => {
  it("返回 session 与 user", async () => {
    const { user, token } = await makeSession();
    const result = await validateSession(token);

    expect(result).toBeTruthy();
    expect(result!.user.id).toBe(user.id);
    expect(result!.session.userId).toBe(user.id);
  });

  it("返回的 user 不含敏感字段", async () => {
    const { token } = await makeSession();
    const result = await validateSession(token);

    const json = JSON.stringify(result!.user);
    expect(json).not.toContain("passwordHash");
    expect(json).not.toContain("$argon2");
  });
});

describe("validateSession — 无效输入", () => {
  it("不存在的 token 返回 null", async () => {
    expect(await validateSession("deadbeef")).toBeNull();
  });

  it("空字符串返回 null", async () => {
    expect(await validateSession("")).toBeNull();
  });

  it("格式正确但哈希不匹配的 token 返回 null", async () => {
    await makeSession();
    const fake = "a".repeat(64);
    expect(await validateSession(fake)).toBeNull();
  });
});

describe("validateSession — 会话失效", () => {
  it("已撤销的会话返回 null", async () => {
    const { user, token } = await makeSession();
    await db.orm.public.Session.where((s) => s.userId.eq(user.id)).update({
      revokedAt: new Date().toISOString(),
    });
    expect(await validateSession(token)).toBeNull();
  });

  it("已过期的会话返回 null", async () => {
    const { user, token } = await makeSession();
    await db.orm.public.Session.where((s) => s.userId.eq(user.id)).update({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await validateSession(token)).toBeNull();
  });

  it("刚好过期（边界）返回 null", async () => {
    const { user, token } = await makeSession();
    await db.orm.public.Session.where((s) => s.userId.eq(user.id)).update({
      expiresAt: new Date(Date.now() - 1).toISOString(),
    });
    expect(await validateSession(token)).toBeNull();
  });

  it("sessionVersion 与 User 不一致时返回 null", async () => {
    const { user, token } = await makeSession();
    await db.orm.public.User.where({ id: user.id }).update({
      sessionVersion: user.sessionVersion + 1,
    });
    expect(await validateSession(token)).toBeNull();
  });

  it("Session 被删除后返回 null", async () => {
    const { user, token } = await makeSession();
    await db.orm.public.Session.where((s) => s.userId.eq(user.id)).delete();
    expect(await validateSession(token)).toBeNull();
  });

  it("用户被删除后返回 null（级联删 Session）", async () => {
    const { user, token } = await makeSession();
    await deleteUser(user.id);
    // 已删除，不必再走 cleanup
    created.length = 0;
    expect(await validateSession(token)).toBeNull();
  });
});

describe("validateSession — 令牌不可预测性与隔离", () => {
  it("两个会话的 token 哈希不同", async () => {
    const a = await makeSession();
    const b = await makeSession();
    const ra = await validateSession(a.token);
    const rb = await validateSession(b.token);
    expect(ra!.session.tokenHash).not.toBe(rb!.session.tokenHash);
  });

  it("A 的 token 不会通过 B 的校验（不同用户互不干扰）", async () => {
    const a = await makeSession();
    const b = await makeSession();
    const ra = await validateSession(a.token);
    expect(ra!.user.id).not.toBe(b.user.id);
  });

  it("全局失效后所有 token 都无效", async () => {
    const a = await makeSession();
    const b = await makeSession();

    const { invalidateAllSessions } = await import("#lib/auth/session-manager");
    await invalidateAllSessions(a.user.id);
    await invalidateAllSessions(b.user.id);

    expect(await validateSession(a.token)).toBeNull();
    expect(await validateSession(b.token)).toBeNull();
  });
});
