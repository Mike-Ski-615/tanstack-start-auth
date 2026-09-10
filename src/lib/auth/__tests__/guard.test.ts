import "#test/mock-server-env";
import { describe, it, expect, afterEach, vi } from "vitest";
import { getCurrentUser } from "#lib/auth/guard";
import { db } from "#prisma/db";
import { createUser, deleteUser, withRequest } from "#test/helpers";

/**
 * 请求守卫（guard.ts）。
 *
 * 所有认证 serverFn 都从这里取当前用户，此前的覆盖全是间接的
 * （跑任何 serverFn 测试都会经过它，但没有针对它的用例）。
 *
 * getCurrentUser 做三件事，逐条验：
 *   1. 读 session-token cookie，没有就返回 null
 *   2. 校验会话，无效时**清掉 cookie** 并返回 null
 *   3. 有效时返回 user，并（非阻塞地）更新 Device.lastSeenAt
 */

const created: string[] = [];

async function cleanup() {
  vi.restoreAllMocks();
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

async function userWithSession(verified = true) {
  const { user, email } = await createUser({ verified });
  created.push(user.id);
  const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
  const { token } = await createAuthenticatedSession({
    userId: user.id,
    userAgent: "vitest",
    ip: "192.0.2.10",
  });
  return { user, email, token };
}

const withToken = <T>(token: string, fn: () => Promise<T>) =>
  withRequest({ cookies: { "session-token": token } }, fn);

describe("getCurrentUser — 无会话", () => {
  it("没有 cookie 时返回 null", async () => {
    expect(await withRequest({}, () => getCurrentUser())).toBeNull();
  });

  it("cookie 为空字符串时返回 null", async () => {
    expect(
      await withRequest({ cookies: { "session-token": "" } }, () => getCurrentUser()),
    ).toBeNull();
  });
});

describe("getCurrentUser — 会话无效", () => {
  it("token 不存在时返回 null", async () => {
    expect(
      await withRequest({ cookies: { "session-token": "nope" } }, () => getCurrentUser()),
    ).toBeNull();
  });

  it("会话被撤销后返回 null", async () => {
    const { user, token } = await userWithSession();
    await db.orm.public.Session.where((s) => s.userId.eq(user.id)).update({
      revokedAt: new Date().toISOString(),
    });
    expect(await withToken(token, () => getCurrentUser())).toBeNull();
  });

  it("会话过期后返回 null", async () => {
    const { user, token } = await userWithSession();
    await db.orm.public.Session.where((s) => s.userId.eq(user.id)).update({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    expect(await withToken(token, () => getCurrentUser())).toBeNull();
  });

  it("sessionVersion 不匹配后返回 null（全局失效）", async () => {
    const { user, token } = await userWithSession();
    await db.orm.public.User.where({ id: user.id }).update({
      sessionVersion: user.sessionVersion + 1,
    });
    expect(await withToken(token, () => getCurrentUser())).toBeNull();
  });
});

describe("getCurrentUser — 会话有效", () => {
  it("返回用户，且形状符合 PUBLIC_COLUMNS", async () => {
    const { user, email, token } = await userWithSession();
    const me = await withToken(token, () => getCurrentUser());

    expect(me).toBeTruthy();
    expect(me!.id).toBe(user.id);
    expect(me!.email).toBe(email);
  });

  it("不返回 passwordHash", async () => {
    const { token } = await userWithSession();
    const me = await withToken(token, () => getCurrentUser());

    expect(JSON.stringify(me)).not.toContain("passwordHash");
    expect(JSON.stringify(me)).not.toContain("$argon2");
  });

  it("未验证邮箱的用户也能通过守卫（验证状态不是门槛）", async () => {
    const { token } = await userWithSession(false);
    const me = await withToken(token, () => getCurrentUser());

    expect(me).toBeTruthy();
    expect(me!.emailVerifiedAt ?? null).toBeNull();
  });
});

describe("getCurrentUser — Device.lastSeenAt 副作用", () => {
  it("首次校验会写 lastSeenAt（此前为旧值）", async () => {
    const { user, token } = await userWithSession();

    // 把 lastSeenAt 推到很久以前
    const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await db.orm.public.Device.where((d) => d.userId.eq(user.id)).update({
      lastSeenAt: old,
    });

    await withToken(token, () => getCurrentUser());
    // touchLastSeen 是 fire-and-forget（void），给它一拍
    await new Promise((r) => setTimeout(r, 400));

    const [d] = await db.orm.public.Device.where((dev) => dev.userId.eq(user.id)).all();
    expect(new Date(d.lastSeenAt!).getTime()).toBeGreaterThan(new Date(old).getTime());
  });

  it("校验失败时不写 lastSeenAt", async () => {
    const { user } = await userWithSession();
    const old = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await db.orm.public.Device.where((d) => d.userId.eq(user.id)).update({
      lastSeenAt: old,
    });

    await withRequest({ cookies: { "session-token": "bad" } }, () => getCurrentUser());
    await new Promise((r) => setTimeout(r, 300));

    const [d] = await db.orm.public.Device.where((dev) => dev.userId.eq(user.id)).all();
    // 比时间戳而非字符串：DB 返回 "2026-09-10 21:13:38.926+08" 这种格式，
    // 与写进去的 ISO 串字面不同
    expect(new Date(d.lastSeenAt!).getTime()).toBe(new Date(old).getTime());
  });
});
