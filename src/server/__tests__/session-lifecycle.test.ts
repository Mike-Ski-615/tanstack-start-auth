import "#test/mock-server-env";
import { describe, it, expect, afterEach } from "vitest";
import { logout } from "#server/logout.functions";
import { revokeAllSessionsFn } from "#server/sessions.functions";
import { updateProfileFn, changePasswordFn } from "#server/profile.functions";
import { changePasswordSchema, updateProfileSchema } from "#schemas/auth";
import { validateSession } from "#lib/auth/session-manager";
import { db } from "#prisma/db";
import {
  TEST_PASSWORD,
  createUser,
  deleteUser,
  withRequest,
  callServerFnValidated,
  getSessions,
  getDevices,
} from "#test/helpers";

/**
 * 会话生命周期测试：登出 / 全局登出 / 资料更新 / 改密。
 *
 * 断言策略（重要）：serverFn 的返回值拿不到 —— 客户端存根在返回 null 或
 * 对象时都会崩/丢失（实测：getUserFn 未登录会抛 Cannot read properties
 * of null）。所以：
 *   - 成功 → 断言数据库副作用
 *   - 失败 → 断言 rejects.toThrow()
 *   - 「会话是否有效」用 validateSession 判断，而非通过 serverFn 读返回值
 */

const created: string[] = [];

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

/** 建用户并建立会话，返回原始 token。 */
/**
 * 建用户并建立会话，返回原始 token + deviceKey。
 *
 * 两个 cookie 都要返回：真实浏览器登录后 session-token 与 device_key 都在，
 * 而 deviceKey 是「设备身份」，后续建立会话的路径（改密等）靠它复用同一台
 * 设备。只给 session-token 会漏掉这个前提，测不出 Device 复用相关的行为。
 */
async function sessionFor(verified = true) {
  const { user, email } = await createUser({ verified });
  created.push(user.id);
  const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
  const { token, deviceKey } = await createAuthenticatedSession({
    userId: user.id,
    userAgent: "vitest",
    ip: "192.0.2.10",
  });
  return { user, email, token, deviceKey };
}

const withToken = <T>(token: string, fn: () => Promise<T>) =>
  withRequest({ cookies: { "session-token": token } }, fn);

// ============================================================
// logout
// ============================================================

describe("登出", () => {
  it("标记当前会话为已撤销", async () => {
    const { user, token } = await sessionFor();

    await withToken(token, () => logout());

    const [s] = await getSessions(user.id);
    expect(s.revokedAt).toBeTruthy();
  });

  it("撤销后该 token 不再通过校验", async () => {
    const { token } = await sessionFor();

    await withToken(token, () => logout());

    expect(await validateSession(token)).toBeNull();
  });

  it("未登录调用不抛错（幂等空操作）", async () => {
    await expect(withRequest({}, () => logout())).resolves.toBeUndefined();
  });

  it("无 cookie 不抛错", async () => {
    await expect(withRequest({ cookies: {} }, () => logout())).resolves.toBeUndefined();
  });

  it("无效 token 不抛错（查不到记录）", async () => {
    await expect(
      withRequest({ cookies: { "session-token": "deadbeef" } }, () => logout()),
    ).resolves.toBeUndefined();
  });

  it("重复登出不抛错", async () => {
    const { token } = await sessionFor();
    await withToken(token, () => logout());
    await expect(withToken(token, () => logout())).resolves.toBeUndefined();
  });

  it("只影响自己的会话", async () => {
    const a = await sessionFor();
    const b = await sessionFor();

    await withToken(a.token, () => logout());

    expect(await validateSession(a.token)).toBeNull();
    expect(await validateSession(b.token)).toBeTruthy();
  });
});

// ============================================================
// revokeAllSessionsFn
// ============================================================

describe("全局登出（撤销所有会话）", () => {
  it("未登录抛错", async () => {
    await expect(withRequest({}, () => revokeAllSessionsFn())).rejects.toThrow();
  });

  it("递增 sessionVersion", async () => {
    const { user, token } = await sessionFor();
    const before = user.sessionVersion;

    await withToken(token, () => revokeAllSessionsFn());

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.sessionVersion).toBe(before + 1);
  });

  it("使当前会话失效", async () => {
    const { token } = await sessionFor();

    await withToken(token, () => revokeAllSessionsFn());

    expect(await validateSession(token)).toBeNull();
  });

  it("不影响其他用户", async () => {
    const a = await sessionFor();
    const b = await sessionFor();

    await withToken(a.token, () => revokeAllSessionsFn());

    expect(await validateSession(a.token)).toBeNull();
    expect(await validateSession(b.token)).toBeTruthy();
  });
});

// ============================================================
// updateProfileFn
// ============================================================

describe("更新资料", () => {
  it("未登录抛错", async () => {
    await expect(
      withRequest({}, () => updateProfileFn({ data: { name: "X", bio: "Y" } })),
    ).rejects.toThrow();
  });

  it("更新 name 与 bio", async () => {
    const { user, token } = await sessionFor();

    await withToken(token, () => updateProfileFn({ data: { name: "新名字", bio: "新简介" } }));

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.name).toBe("新名字");
    expect(after!.bio).toBe("新简介");
  });

  it("只能改自己的资料", async () => {
    const a = await sessionFor();
    const b = await sessionFor();

    await withToken(a.token, () => updateProfileFn({ data: { name: "A改", bio: "A简介" } }));

    const bb = await db.orm.public.User.where({ id: b.user.id }).first();
    expect(bb!.name).not.toBe("A改");
  });

  it("不影响密码、sessionVersion 与会话数量", async () => {
    const { user, token } = await sessionFor();
    const before = await db.orm.public.User.where({ id: user.id }).first();

    await withToken(token, () => updateProfileFn({ data: { name: "改过", bio: "" } }));

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.passwordHash).toBe(before!.passwordHash);
    expect(after!.sessionVersion).toBe(before!.sessionVersion);
    expect(await getSessions(user.id)).toHaveLength(1);
    expect(await validateSession(token)).toBeTruthy();
  });

  it("非法 name 被校验拦下", async () => {
    const { token } = await sessionFor();

    await expect(
      callServerFnValidated(
        updateProfileFn,
        updateProfileSchema,
        { name: "", bio: "" },
        { cookies: { "session-token": token } },
      ),
    ).rejects.toThrow();
  });

  it("name 超长被拦下", async () => {
    const { token } = await sessionFor();

    await expect(
      callServerFnValidated(
        updateProfileFn,
        updateProfileSchema,
        { name: "x".repeat(51), bio: "" },
        { cookies: { "session-token": token } },
      ),
    ).rejects.toThrow();
  });

  it("bio 超长被拦下", async () => {
    const { token } = await sessionFor();

    await expect(
      callServerFnValidated(
        updateProfileFn,
        updateProfileSchema,
        { name: "ok", bio: "x".repeat(201) },
        { cookies: { "session-token": token } },
      ),
    ).rejects.toThrow();
  });
});

// ============================================================
// changePasswordFn
// ============================================================

describe("修改密码", () => {
  it("未登录抛错", async () => {
    await expect(
      withRequest({}, () =>
        changePasswordFn({
          data: { currentPassword: "x", newPassword: "newpass123" },
        }),
      ),
    ).rejects.toThrow();
  });

  it("当前密码错误抛错且密码不变", async () => {
    const { user, token } = await sessionFor();
    const before = await db.orm.public.User.where({ id: user.id }).first();

    await expect(
      withToken(token, () =>
        changePasswordFn({
          data: { currentPassword: "wrong", newPassword: "newpass123" },
        }),
      ),
    ).rejects.toThrow();

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.passwordHash).toBe(before!.passwordHash);
  });

  it("当前密码错误时不影响会话", async () => {
    const { token } = await sessionFor();

    await withToken(token, () =>
      changePasswordFn({
        data: { currentPassword: "wrong", newPassword: "newpass123" },
      }),
    ).catch(() => {});

    expect(await validateSession(token)).toBeTruthy();
  });

  it("成功后密码被替换", async () => {
    const { user, token } = await sessionFor();
    const before = await db.orm.public.User.where({ id: user.id }).first();

    await withToken(token, () =>
      changePasswordFn({
        data: { currentPassword: TEST_PASSWORD, newPassword: "brandnew123" },
      }),
    );

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.passwordHash).not.toBe(before!.passwordHash);
  });

  it("成功后 sessionVersion 递增（旧会话全局失效）", async () => {
    const { user, token } = await sessionFor();
    const before = user.sessionVersion;

    await withToken(token, () =>
      changePasswordFn({
        data: { currentPassword: TEST_PASSWORD, newPassword: "brandnew123" },
      }),
    );

    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(after!.sessionVersion).toBe(before + 1);
  });

  it("成功后旧 token 失效", async () => {
    const { token } = await sessionFor();

    await withToken(token, () =>
      changePasswordFn({
        data: { currentPassword: TEST_PASSWORD, newPassword: "brandnew123" },
      }),
    );

    expect(await validateSession(token)).toBeNull();
  });

  it("成功后建立新会话（当前登录态延续）", async () => {
    const { user, token } = await sessionFor();

    await withToken(token, () =>
      changePasswordFn({
        data: { currentPassword: TEST_PASSWORD, newPassword: "brandnew123" },
      }),
    );

    const sessions = await getSessions(user.id);
    expect(sessions).toHaveLength(1);
    const after = await db.orm.public.User.where({ id: user.id }).first();
    expect(sessions[0].sessionVersion).toBe(after!.sessionVersion);
    expect(sessions[0].revokedAt ?? null).toBeNull();
  });

  it("成功后新密码可用、旧密码不可用", async () => {
    const { user, email, token } = await sessionFor();

    await withToken(token, () =>
      changePasswordFn({
        data: { currentPassword: TEST_PASSWORD, newPassword: "brandnew123" },
      }),
    );

    const full = await db.orm.public.User.where({ id: user.id }).first();
    const { verifyPassword } = await import("#lib/auth/password");
    expect(await verifyPassword(full!.passwordHash, "brandnew123")).toBe(true);
    expect(await verifyPassword(full!.passwordHash, TEST_PASSWORD)).toBe(false);
    expect(full!.email).toBe(email);
  });

  it("不影响其他用户的密码与会话", async () => {
    const a = await sessionFor();
    const b = await sessionFor();
    const bb = await db.orm.public.User.where({ id: b.user.id }).first();

    await withToken(a.token, () =>
      changePasswordFn({
        data: { currentPassword: TEST_PASSWORD, newPassword: "brandnew123" },
      }),
    );

    const afterB = await db.orm.public.User.where({ id: b.user.id }).first();
    expect(afterB!.passwordHash).toBe(bb!.passwordHash);
    expect(await validateSession(b.token)).toBeTruthy();
  });

  it("新密码过短被校验拦下", async () => {
    const { token } = await sessionFor();

    await expect(
      callServerFnValidated(
        changePasswordFn,
        changePasswordSchema,
        { currentPassword: TEST_PASSWORD, newPassword: "123" },
        { cookies: { "session-token": token } },
      ),
    ).rejects.toThrow();
  });

  it("当前密码为空被校验拦下", async () => {
    const { token } = await sessionFor();

    await expect(
      callServerFnValidated(
        changePasswordFn,
        changePasswordSchema,
        { currentPassword: "", newPassword: "brandnew123" },
        { cookies: { "session-token": token } },
      ),
    ).rejects.toThrow();
  });
});

// ============================================================
// Device 复用（signIn 统一读 device_key cookie 后的行为）
// ============================================================

describe("Device 身份在登录态切换时保持一致", () => {
  /**
   * 背景：deviceKey 是「设备身份标识」，生命周期长于 Session
   * （见 CONTEXT.md）。因此凡是建立会话的路径 —— 登录、邮箱验证、
   * 改密、重置密码 —— 都应复用当前浏览器已有的 Device，
   * 而不是新建一个。
   *
   * 改动前只有 login 会读 device_key cookie，另外三条路径每次都新建
   * Device，同一台浏览器因此在改密/验证后「换了设备」。
   */

  it("改密后 Device 不变（复用同一台设备）", async () => {
    const { user, token, deviceKey } = await sessionFor();
    const [before] = await getDevices(user.id);
    expect(before).toBeTruthy();

    // 真实浏览器两个 cookie 都在
    await withRequest(
      {
        cookies: { "session-token": token, device_key: deviceKey },
      },
      () =>
        changePasswordFn({
          data: { currentPassword: TEST_PASSWORD, newPassword: "brandnew123" },
        }),
    );

    const devices = await getDevices(user.id);
    expect(devices).toHaveLength(1);
    // 仍只有一条 Device（单设备模型），且 deviceKey 未变
    expect(devices[0].deviceKey).toBe(before.deviceKey);
  });

  it("改密后 Device 的 id 也未变（不是删旧建新）", async () => {
    const { user, token, deviceKey } = await sessionFor();
    const [before] = await getDevices(user.id);

    await withRequest(
      {
        cookies: { "session-token": token, device_key: deviceKey },
      },
      () =>
        changePasswordFn({
          data: { currentPassword: TEST_PASSWORD, newPassword: "brandnew123" },
        }),
    );

    const [after] = await getDevices(user.id);
    expect(after.id).toBe(before.id);
  });

  it("登录时同样复用已有 Device（原有行为，防回归）", async () => {
    const { user, email, token } = await sessionFor();
    const [before] = await getDevices(user.id);
    expect(before).toBeTruthy();

    // 带上 device_key cookie 再登录一次
    await withRequest(
      {
        ip: "192.0.2.30",
        cookies: {
          "session-token": token,
          device_key: before.deviceKey,
        },
      },
      () =>
        import("#server/login.functions").then(({ login }) =>
          login({ data: { email, password: TEST_PASSWORD } }),
        ),
    );

    const devices = await getDevices(user.id);
    expect(devices).toHaveLength(1);
    expect(devices[0].deviceKey).toBe(before.deviceKey);
  });

  it("没有 device_key cookie 时新建 Device（首次访问）", async () => {
    const { user } = await createUser({ verified: true });

    // 不带任何 cookie 建会话
    const { createAuthenticatedSession } = await import("#lib/auth/session-manager");
    await withRequest({ ip: "192.0.2.30" }, () =>
      createAuthenticatedSession({ userId: user.id, ip: "192.0.2.30" }),
    );

    const devices = await getDevices(user.id);
    expect(devices).toHaveLength(1);
  });
});
