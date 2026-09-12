import { db } from "#prisma/db";
import { generateDeviceKey } from "#lib/auth/token";
import { formatDeviceName, inferPlatform } from "#lib/auth/device-name";

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

export async function ensureDevice(params: {
  userId: string;
  existingDeviceKey?: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ device: Device; deviceKey: string }> {
  const { userId, existingDeviceKey, userAgent = null, ip = null } = params;
  const userIdStr = userId;

  if (existingDeviceKey) {
    const existing = await db.orm.public.Device.where({
      deviceKey: existingDeviceKey,
    }).first();
    if (existing && existing.userId === userIdStr) {
      return { device: existing, deviceKey: existingDeviceKey };
    }
  }

  await db.orm.public.Device.where({ userId: userIdStr }).delete();

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

  return { device, deviceKey };
}

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
    console.error("[Auth] touchLastSeen failed", error);
  }
}
