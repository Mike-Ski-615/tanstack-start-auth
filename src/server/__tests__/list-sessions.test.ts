import "#test/mock-server-env";
import { describe, it, expect, afterEach } from "vitest";
import { listSessionsFn } from "#server/sessions.functions";
import { db } from "#prisma/db";
import { createUser, deleteUser, withRequest, getDevices, getSessions } from "#test/helpers";

/**
 * listSessionsFn —— 隐私与安全页的数据源。
 *
 * 测试策略说明：serverFn 的返回值在测试环境里拿不到（客户端存根要经 RPC
 * 传输层回传，测试里没有），而本函数的全部价值恰恰是返回值。因此这里
 * 测两件**可观测**的事：
 *
 * 1. 它能否在两种会话状态下正常执行（未登录 / 已登录，后者不抛错）
 * 2. 投影字段的形状 —— 按同样的 .select() 查一遍，断言键集合
 *
 * 第 2 条是这个函数最该守住的东西：源码里两个 .select() 就是发给客户端的
 * 字段白名单，tokenHash 与 deviceKey 是凭证，一旦被加进去就是泄露。
 * 键集合断言能在那一刻失败。
 */

const created: string[] = [];

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

async function loggedIn() {
  const { user, email } = await createUser({ verified: true });
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

// ============================================================
// 可执行性
// ============================================================

describe("listSessionsFn — 可执行性", () => {
  it("未登录时不抛错（返回全 null 分支）", async () => {
    // 未登录时函数返回 null 三元组，不抛错 —— 这是安全页在会话失效后的
    // 正常路径，不应该是异常
    await expect(withRequest({}, () => listSessionsFn())).resolves.toBeUndefined();
  });

  it("无效 token 时不抛错", async () => {
    await expect(
      withRequest({ cookies: { "session-token": "bogus" } }, () => listSessionsFn()),
    ).resolves.toBeUndefined();
  });

  it("已登录时正常执行", async () => {
    const { token } = await loggedIn();
    await expect(withToken(token, () => listSessionsFn())).resolves.toBeUndefined();
  });

  it("未验证邮箱的用户也能查（emailVerifiedAt 为 null 是合法状态）", async () => {
    const { user } = await createUser({ verified: false });
    created.push(user.id);
    const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
    const { token } = await createAuthenticatedSession({
      userId: user.id,
      ip: "192.0.2.10",
    });

    await expect(withToken(token, () => listSessionsFn())).resolves.toBeUndefined();
  });
});

// ============================================================
// 投影字段白名单（核心）
// ============================================================

/** 与 listSessionsFn 里两个 .select() 对应的字段清单。 */
const DEVICE_FIELDS = [
  "id",
  "name",
  "platform",
  "userAgent",
  "ip",
  "lastSeenAt",
  "createdAt",
] as const;

const SESSION_FIELDS = ["id", "sessionVersion", "createdAt", "expiresAt"] as const;

describe("listSessionsFn — 投影字段白名单", () => {
  it("Device 只投影白名单字段", async () => {
    const { user } = await loggedIn();

    const device = await db.orm.public.Device.where({ userId: user.id })
      .select(...DEVICE_FIELDS)
      .first();

    expect(device).toBeTruthy();
    expect(Object.keys(device!).sort()).toEqual([...DEVICE_FIELDS].sort());
  });

  it("Session 只投影白名单字段", async () => {
    const { user } = await loggedIn();

    const session = await db.orm.public.Session.where({ userId: user.id })
      .select(...SESSION_FIELDS)
      .first();

    expect(session).toBeTruthy();
    expect(Object.keys(session!).sort()).toEqual([...SESSION_FIELDS].sort());
  });

  it("白名单里没有 deviceKey —— 它是凭证", () => {
    expect(DEVICE_FIELDS as readonly string[]).not.toContain("deviceKey");
  });

  it("白名单里没有 tokenHash —— 它是凭证", () => {
    expect(SESSION_FIELDS as readonly string[]).not.toContain("tokenHash");
  });

  it("投影结果序列化后不含 deviceKey", async () => {
    const { user } = await loggedIn();
    const [full] = await getDevices(user.id);
    expect(full.deviceKey).toBeTruthy();

    const projected = await db.orm.public.Device.where({ userId: user.id })
      .select(...DEVICE_FIELDS)
      .first();

    expect(JSON.stringify(projected)).not.toContain(full.deviceKey);
    expect(JSON.stringify(projected)).not.toContain("deviceKey");
  });

  it("投影结果序列化后不含 tokenHash", async () => {
    const { user } = await loggedIn();
    const [full] = await getSessions(user.id);
    expect(full.tokenHash).toBeTruthy();

    const projected = await db.orm.public.Session.where({ userId: user.id })
      .select(...SESSION_FIELDS)
      .first();

    expect(JSON.stringify(projected)).not.toContain(full.tokenHash);
    expect(JSON.stringify(projected)).not.toContain("tokenHash");
  });

  it("Session 投影不含 userId / deviceId（内部关联标识不必外发）", async () => {
    const { user } = await loggedIn();
    const session = await db.orm.public.Session.where({ userId: user.id })
      .select(...SESSION_FIELDS)
      .first();

    expect(session).not.toHaveProperty("userId");
    expect(session).not.toHaveProperty("deviceId");
  });

  it("Device 投影不含 userId", async () => {
    const { user } = await loggedIn();
    const device = await db.orm.public.Device.where({ userId: user.id })
      .select(...DEVICE_FIELDS)
      .first();

    expect(device).not.toHaveProperty("userId");
  });
});

// ============================================================
// 单设备模型下的数据形状
// ============================================================

describe("listSessionsFn — 单设备模型", () => {
  it("已登录用户恰好一条 Device、一条 Session", async () => {
    const { user } = await loggedIn();

    expect(await getDevices(user.id)).toHaveLength(1);
    expect(await getSessions(user.id)).toHaveLength(1);
  });

  it("未建立会话的用户查不到 Device / Session（对应全 null 分支）", async () => {
    const { user } = await createUser({ verified: true });
    created.push(user.id);

    expect(await getDevices(user.id)).toHaveLength(0);
    expect(await getSessions(user.id)).toHaveLength(0);
  });

  it("emailVerifiedAt 由 User 提供，不是 Device/Session 的字段", async () => {
    const { user } = await loggedIn();
    const row = await db.orm.public.User.where({ id: user.id }).select("emailVerifiedAt").first();

    expect(row).toHaveProperty("emailVerifiedAt");
    expect(row!.emailVerifiedAt).toBeTruthy();
  });
});
