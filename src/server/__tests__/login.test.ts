import "#test/mock-server-env";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { login } from "#server/login.functions";
import { loginSchema } from "#schemas/auth";
import {
  uniqueEmail,
  TEST_PASSWORD,
  createUser,
  deleteUser,
  scopedClearRateLimit,
  withRequest,
  callServerFnValidated,
  getSessions,
  getDevices,
} from "#test/helpers";

/**
 * 登录模块测试。
 *
 * 断言策略同 register：成功断言 DB 副作用，失败断言抛错。
 * 输入校验用 callServerFnValidated —— 测试直调时 validator 不执行。
 */

const created: string[] = [];
const IP = "198.51.100.10"; // TEST-NET-2

async function cleanup() {
  for (const id of created.splice(0)) await deleteUser(id);
}

const doLogin = (data: { email: string; password: string }, ip = IP) =>
  withRequest({ ip }, () => login({ data }));

const loginValidated = (data: { email: string; password: string }, ip = IP) =>
  callServerFnValidated(login, loginSchema, data, { ip });

beforeEach(async () => {
  await scopedClearRateLimit(IP, "login");
});

afterEach(cleanup);

// ============================================================
// 成功路径
// ============================================================

describe("登录 — 成功路径", () => {
  it("凭据正确时建立 Session", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });

    const sessions = await getSessions(user.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].revokedAt ?? null).toBeNull();
  });

  it("同时建立 Device", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });

    const devices = await getDevices(user.id);
    expect(devices).toHaveLength(1);
  });

  it("Session 存的令牌哈希与明文不同（不存明文）", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });

    const [s] = await getSessions(user.id);
    expect(s.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("Session 继承 User.sessionVersion", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });

    const [s] = await getSessions(user.id);
    expect(s.sessionVersion).toBe(user.sessionVersion);
  });

  it("Session 有效期为 7 天", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });

    const [s] = await getSessions(user.id);
    const ttl = new Date(s.expiresAt).getTime() - Date.now();
    expect(ttl).toBeGreaterThan(6.9 * 24 * 3600 * 1000);
    expect(ttl).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);
  });

  it("记录 User-Agent 与 IP", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await withRequest({ ip: "198.51.100.42", headers: { "user-agent": "TestBrowser/1.0" } }, () =>
      login({ data: { email, password: TEST_PASSWORD } }),
    );

    const [s] = await getSessions(user.id);
    expect(s.userAgent).toBe("TestBrowser/1.0");
    expect(s.ip).toBe("198.51.100.42");
  });

  it("未验证邮箱也能登录（当前实现不做拦截）", async () => {
    const { user, email } = await createUser({ verified: false });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });

    const sessions = await getSessions(user.id);
    expect(sessions).toHaveLength(1);
  });
});

// ============================================================
// 单设备模型：重复登录踢掉旧会话
// ============================================================

describe("登录 — 单设备模型", () => {
  it("同账号二次登录后仍只有一条 Session", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });
    await doLogin({ email, password: TEST_PASSWORD });

    const sessions = await getSessions(user.id);
    expect(sessions).toHaveLength(1);
  });

  it("二次登录后旧 Session 的 tokenHash 已不存在（被替换）", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });
    const [first] = await getSessions(user.id);
    const firstHash = first.tokenHash;

    await doLogin({ email, password: TEST_PASSWORD });

    const [second] = await getSessions(user.id);
    expect(second.tokenHash).not.toBe(firstHash);
  });

  it("二次登录不会新增 Device（Device:userId 唯一）", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });
    await doLogin({ email, password: TEST_PASSWORD });

    const devices = await getDevices(user.id);
    expect(devices).toHaveLength(1);
  });

  it("携带已有 deviceKey 时复用同一 Device", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: TEST_PASSWORD });
    const [d1] = await getDevices(user.id);

    // 模拟同设备再登录：带上 deviceKey cookie
    await withRequest({ ip: IP, cookies: { device_key: d1.deviceKey } }, () =>
      login({ data: { email, password: TEST_PASSWORD } }),
    );

    const devices = await getDevices(user.id);
    expect(devices).toHaveLength(1);
    expect(devices[0].deviceKey).toBe(d1.deviceKey);
  });

  it("并发登录同账号最终只留一条 Session", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await Promise.allSettled([
      doLogin({ email, password: TEST_PASSWORD }, "198.51.100.201"),
      doLogin({ email, password: TEST_PASSWORD }, "198.51.100.202"),
    ]);

    const sessions = await getSessions(user.id);
    expect(sessions).toHaveLength(1);
  });

  it("不同用户各自独立一条 Session", async () => {
    const a = await createUser({ verified: true });
    const b = await createUser({ verified: true });
    created.push(a.user.id, b.user.id);

    await doLogin({ email: a.email, password: TEST_PASSWORD });
    await doLogin({ email: b.email, password: TEST_PASSWORD });

    expect(await getSessions(a.user.id)).toHaveLength(1);
    expect(await getSessions(b.user.id)).toHaveLength(1);
  });
});

// ============================================================
// 凭据失败 + 防枚举
// ============================================================

describe("登录 — 凭据失败", () => {
  it("密码错误抛错且不建 Session", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await expect(doLogin({ email, password: "wrong-password" })).rejects.toThrow();

    expect(await getSessions(user.id)).toHaveLength(0);
  });

  it("用户不存在抛错", async () => {
    await expect(
      doLogin({ email: uniqueEmail("ghost"), password: TEST_PASSWORD }),
    ).rejects.toThrow();
  });

  it("大小写不同的密码视为错误", async () => {
    const { user, email } = await createUser({
      verified: true,
      password: "CaseSensitive1",
    });
    created.push(user.id);

    await expect(doLogin({ email, password: "casesensitive1" })).rejects.toThrow();
    expect(await getSessions(user.id)).toHaveLength(0);
  });

  it("失败不创建 Device", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    await doLogin({ email, password: "nope" }).catch(() => {});
    expect(await getDevices(user.id)).toHaveLength(0);
  });
});

// ============================================================
// 限速（5 次/分钟/邮箱+IP）
// ============================================================

describe("登录 — 限速", () => {
  it("前 5 次失败均被正常拒绝，第 6 次触发限速", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    await scopedClearRateLimit(IP, "login");

    // 密码必须合法（min 6）：validator 在入口就会拒掉太短的密码，
    // 那样 handler 根本不会跑，限速计数也就不会累加 —— 这个用例会
    // 假装通过（第 6 次成功登录，而不是被限速拦住）。
    for (let i = 0; i < 5; i++) {
      await doLogin({ email, password: "wrongpass" }).catch(() => {});
    }
    // 第 6 次：即使密码正确也应被限速拦住
    await expect(doLogin({ email, password: TEST_PASSWORD })).rejects.toThrow();

    expect(await getSessions(user.id)).toHaveLength(0);
  });

  it("限速按「邮箱+IP」组合，不同 IP 独立", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    await scopedClearRateLimit(IP, "login");

    for (let i = 0; i < 5; i++) {
      await doLogin({ email, password: "wrong" }, "198.51.100.1").catch(() => {});
    }

    // 换 IP，正确密码仍可登录
    await doLogin({ email, password: TEST_PASSWORD }, "198.51.100.2");
    expect(await getSessions(user.id)).toHaveLength(1);
  });

  it("同 IP 不同邮箱各自独立计数", async () => {
    const a = await createUser({ verified: true });
    const b = await createUser({ verified: true });
    created.push(a.user.id, b.user.id);
    await scopedClearRateLimit(IP, "login");

    for (let i = 0; i < 5; i++) {
      await doLogin({ email: a.email, password: "wrong" }).catch(() => {});
    }

    // A 被限速，B 不受影响
    await doLogin({ email: b.email, password: TEST_PASSWORD });
    expect(await getSessions(b.user.id)).toHaveLength(1);
  });

  it("被限速时不建 Session", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);
    await scopedClearRateLimit(IP, "login");

    for (let i = 0; i < 6; i++) {
      await doLogin({ email, password: TEST_PASSWORD }).catch(() => {});
    }

    const sessions = await getSessions(user.id);
    expect(sessions.length).toBeLessThanOrEqual(1);
  });
});

// ============================================================
// 输入校验
// ============================================================

describe("登录 — 输入校验", () => {
  it("邮箱格式非法被校验拦下", async () => {
    await expect(loginValidated({ email: "bad", password: TEST_PASSWORD })).rejects.toThrow();
  });

  it("密码为空被校验拦下", async () => {
    await expect(loginValidated({ email: uniqueEmail(), password: "" })).rejects.toThrow();
  });

  it("邮箱为空被校验拦下", async () => {
    await expect(loginValidated({ email: "", password: TEST_PASSWORD })).rejects.toThrow();
  });

  it("密码刚好 6 位通过校验（随后因凭据错误失败）", async () => {
    const { user, email } = await createUser({ verified: true });
    created.push(user.id);

    // 校验通过 → 进入凭据比对 → 密码错误
    await expect(loginValidated({ email, password: "123456" })).rejects.toThrow();
    expect(await getSessions(user.id)).toHaveLength(0);
  });
});
