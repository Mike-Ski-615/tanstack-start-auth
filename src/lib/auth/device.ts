/**
 * Device 管理：创建、查找、更新 lastSeenAt。
 *
 * 单设备约束由 Device.userId UNIQUE 保证；
 * 冲突时删除旧 Device，创建新 Device。
 *
 * 职责边界：ensureDevice() 只管 Device，不管 Session。
 * Session 生命周期由 session-manager.ts 负责。
 */

import { db } from "#prisma/db";
import { generateDeviceKey } from "./token";
import { formatDeviceName, inferPlatform } from "./device-name";

/** lastSeenAt 节流间隔：5 分钟。 */
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;

export type Device = {
  id: string;
  userId: string;
  deviceKey: string;
  platform: "web" | "android" | "ios" | "desktop";
  name: string;
  userAgent: string;
  ip: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * 查找或创建当前用户的 Device。
 *
 * - 同设备（deviceKey 匹配）→ 复用
 * - 不同设备 → 删除旧 Device + 旧 Session，创建新 Device
 * - 无 deviceKey → 生成新 key，创建新 Device
 *
 * @param userId 用户 ID
 * @param existingDeviceKey cookie 中的 deviceKey（可选）
 * @param userAgent User-Agent
 * @param ip IP 地址
 * @returns { device, deviceKey } deviceKey 始终返回（新生成或复用）
 */
export async function ensureDevice(params: {
  userId: string;
  existingDeviceKey?: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ device: Device; deviceKey: string }> {
  const { userId, existingDeviceKey, userAgent = null, ip = null } = params;
  const userIdStr = userId;

  // 1. 尝试按 deviceKey 查找（同设备复用）
  if (existingDeviceKey) {
    const existing = await db.orm.public.Device.where({ deviceKey: existingDeviceKey }).first();
    if (existing && existing.userId === userIdStr) {
      // 数据库有默认值，运行时不会是 null
      return { device: existing, deviceKey: existingDeviceKey };
    }
    // deviceKey 存在但不属于该用户 → 继续走创建流程
  }

  // 2. 删除该用户的旧 Device（单设备冲突）
  // 注意：不删 Session，Session 生命周期由 session-manager 管理
  await db.orm.public.Device.where({ userId: userIdStr }).delete();

  // 3. 创建新 Device
  const deviceKey = generateDeviceKey();
  const now = new Date().toISOString();
  const platform = inferPlatform(userAgent ?? "");
  const name = userAgent ? formatDeviceName(userAgent) : "Unknown Device";

  const device = await db.orm.public.Device.create({
    userId: userIdStr,
    deviceKey,
    platform,
    name,
    userAgent: userAgent ?? "",
    ip: ip ?? "unknown",
    lastSeenAt: now,
  });

  // 数据库有默认值，运行时不会是 null
  return { device, deviceKey };
}

/**
 * 更新 Device 的 lastSeenAt（带 5 分钟节流）。
 *
 * 在会话校验时调用，避免每次请求都写 DB。
 * 内部自行读取当前 lastSeenAt，比较后决定是否更新。
 */
export async function touchLastSeen(deviceId: string): Promise<void> {
  try {
    const device = await db.orm.public.Device.where({ id: deviceId }).select("lastSeenAt").first();
    if (!device) return;

    const now = Date.now();
    const lastSeen = device.lastSeenAt ? new Date(device.lastSeenAt).getTime() : 0;

    if (now - lastSeen < LAST_SEEN_THROTTLE_MS) return;

    await db.orm.public.Device.where({ id: deviceId }).update({
      lastSeenAt: new Date(now).toISOString(),
    });
  } catch (error) {
    // telemetry 故障不影响认证请求
    console.error("[Auth] touchLastSeen failed", error);
  }
}

/** 根据 deviceKey 查找 Device。 */
export async function findDeviceByKey(deviceKey: string): Promise<Device | null> {
  return await db.orm.public.Device.where({ deviceKey }).first();
}

/** 根据 userId 查找 Device。 */
export async function findDeviceByUserId(userId: string): Promise<Device | null> {
  return await db.orm.public.Device.where({ userId }).first();
}
