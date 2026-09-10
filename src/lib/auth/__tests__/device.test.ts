import "#test/mock-server-env";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ensureDevice, touchLastSeen, findDeviceByKey, findDeviceByUserId } from "#lib/auth/device";
import { db } from "#prisma/db";
import { createUser, deleteUser } from "#test/helpers";

/**
 * Device 管理（device.ts）。
 *
 * 此前只被 serverFn 测试间接经过。这里直接验它的三条分支与节流，
 * 其中 touchLastSeen 的 5 分钟节流是最容易写错、也最不容易被
 * 集成测试发现的一处 —— 它只在「频繁请求」下才表现出差别。
 */

const created: string[] = [];

async function cleanup() {
  vi.restoreAllMocks();
  for (const id of created.splice(0)) await deleteUser(id);
}

afterEach(cleanup);

async function newUser() {
  const { user } = await createUser({ verified: true });
  created.push(user.id);
  return user;
}

const devicesOf = (userId: string) => db.orm.public.Device.where((d) => d.userId.eq(userId)).all();

describe("ensureDevice — 首次创建", () => {
  it("无 deviceKey 时创建新 Device 并返回它的 key", async () => {
    const user = await newUser();

    const { device, deviceKey } = await ensureDevice({
      userId: user.id,
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0",
      ip: "192.0.2.10",
    });

    expect(device.userId).toBe(user.id);
    expect(deviceKey).toBeTruthy();
    expect(device.deviceKey).toBe(deviceKey);
  });

  it("解析 User-Agent 写入 name 与 platform", async () => {
    const user = await newUser();
    const { device } = await ensureDevice({
      userId: user.id,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      ip: "192.0.2.10",
    });

    expect(device.platform).toBe("web");
    expect(device.name).toContain("Chrome");
    expect(device.name).toContain("Windows");
  });

  it("无 UA 时用兜底值，不抛错", async () => {
    const user = await newUser();
    const { device } = await ensureDevice({ userId: user.id });

    expect(device.name).toBeTruthy();
    expect(device.platform).toBe("web");
    expect(device.userAgent).toBe("");
    expect(device.ip).toBe("unknown");
  });

  it("单设备模型：一个用户只有一条 Device", async () => {
    const user = await newUser();
    await ensureDevice({ userId: user.id, ip: "1.1.1.1" });
    expect(await devicesOf(user.id)).toHaveLength(1);
  });
});

describe("ensureDevice — 同设备复用", () => {
  it("deviceKey 匹配同一用户时复用，不新建", async () => {
    const user = await newUser();
    const first = await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    const second = await ensureDevice({
      userId: user.id,
      existingDeviceKey: first.deviceKey,
      ip: "2.2.2.2",
    });

    expect(second.device.id).toBe(first.device.id);
    expect(second.deviceKey).toBe(first.deviceKey);
    expect(await devicesOf(user.id)).toHaveLength(1);
  });

  it("复用时不会更新 ip / lastSeenAt（只认 deviceKey 匹配）", async () => {
    const user = await newUser();
    const first = await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    const second = await ensureDevice({
      userId: user.id,
      existingDeviceKey: first.deviceKey,
      ip: "9.9.9.9",
    });

    expect(second.device.ip).toBe("1.1.1.1");
  });
});

describe("ensureDevice — 不同设备替换", () => {
  it("deviceKey 不匹配时删除旧 Device、建新的", async () => {
    const user = await newUser();
    const first = await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    const second = await ensureDevice({
      userId: user.id,
      existingDeviceKey: "someone-elses-key",
      ip: "2.2.2.2",
    });

    expect(second.device.id).not.toBe(first.device.id);
    expect(second.deviceKey).not.toBe(first.deviceKey);
    expect(await devicesOf(user.id)).toHaveLength(1);
  });

  it("传入别人的 deviceKey 时不复用（key 属于其他用户）", async () => {
    const a = await newUser();
    const b = await newUser();
    const devA = await ensureDevice({ userId: a.id, ip: "1.1.1.1" });

    const devB = await ensureDevice({
      userId: b.id,
      existingDeviceKey: devA.deviceKey,
      ip: "2.2.2.2",
    });

    // B 拿到的是自己的新 key，不是 A 的
    expect(devB.deviceKey).not.toBe(devA.deviceKey);
    expect(devB.device.userId).toBe(b.id);
    // A 的 Device 不受影响
    expect(await devicesOf(a.id)).toHaveLength(1);
  });

  it("删除旧 Device 时不碰 Session（职责边界）", async () => {
    const user = await newUser();
    await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    // 手工建一条 Session 挂在旧 Device 上
    const [old] = await devicesOf(user.id);
    await db.orm.public.Session.create({
      userId: user.id,
      deviceId: old.id,
      tokenHash: "a".repeat(64),
      sessionVersion: user.sessionVersion,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    await ensureDevice({ userId: user.id, existingDeviceKey: "other", ip: "2.2.2.2" });

    // Session 还在（ensureDevice 只管 Device）
    const sessions = await db.orm.public.Session.where((s) => s.userId.eq(user.id)).all();
    expect(sessions).toHaveLength(1);
  });
});

describe("touchLastSeen — 5 分钟节流", () => {
  it("lastSeenAt 很旧时更新", async () => {
    const user = await newUser();
    const { device } = await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await db.orm.public.Device.where({ id: device.id }).update({
      lastSeenAt: old,
    });

    await touchLastSeen(device.id);

    const after = await db.orm.public.Device.where({ id: device.id }).first();
    expect(new Date(after!.lastSeenAt!).getTime()).toBeGreaterThan(new Date(old).getTime());
  });

  it("5 分钟内不更新（节流生效）", async () => {
    const user = await newUser();
    const { device } = await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    const recent = new Date(Date.now() - 60 * 1000).toISOString();
    await db.orm.public.Device.where({ id: device.id }).update({
      lastSeenAt: recent,
    });

    await touchLastSeen(device.id);

    const after = await db.orm.public.Device.where({ id: device.id }).first();
    // 时间戳未变
    expect(new Date(after!.lastSeenAt!).getTime()).toBe(new Date(recent).getTime());
  });

  it("刚过 5 分钟边界时会更新", async () => {
    const user = await newUser();
    const { device } = await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    const justOver = new Date(Date.now() - (5 * 60 * 1000 + 1000)).toISOString();
    await db.orm.public.Device.where({ id: device.id }).update({
      lastSeenAt: justOver,
    });

    await touchLastSeen(device.id);

    const after = await db.orm.public.Device.where({ id: device.id }).first();
    expect(new Date(after!.lastSeenAt!).getTime()).toBeGreaterThan(new Date(justOver).getTime());
  });

  it("deviceId 不存在时静默返回，不抛错", async () => {
    await expect(touchLastSeen("00000000-0000-7000-8000-000000000000")).resolves.toBeUndefined();
  });

  it("DB 报错时被吞掉（telemetry 故障不影响认证）", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // 传一个非法 uuid 触发查询层报错
    await expect(touchLastSeen("not-a-uuid")).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

describe("查找函数", () => {
  it("findDeviceByKey 按 key 命中", async () => {
    const user = await newUser();
    const { deviceKey } = await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    const found = await findDeviceByKey(deviceKey);
    expect(found).toBeTruthy();
    expect(found!.deviceKey).toBe(deviceKey);
  });

  it("findDeviceByKey 不存在的 key 返回 null", async () => {
    expect(await findDeviceByKey("no-such-key")).toBeNull();
  });

  it("findDeviceByUserId 命中该用户的设备", async () => {
    const user = await newUser();
    await ensureDevice({ userId: user.id, ip: "1.1.1.1" });

    const found = await findDeviceByUserId(user.id);
    expect(found).toBeTruthy();
    expect(found!.userId).toBe(user.id);
  });

  it("findDeviceByUserId 对无设备的用户返回 null", async () => {
    const user = await newUser();
    expect(await findDeviceByUserId(user.id)).toBeNull();
  });
});
