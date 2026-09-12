import { db } from "#prisma/db";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { PUBLIC_COLUMNS, type User } from "#lib/auth/current-user";
import { generateToken, hashToken } from "#lib/auth/token";
import { ensureDevice } from "#lib/auth/device";
import { setSessionCookie, setDeviceCookie, getDeviceKey } from "#lib/auth/session";
import { recordLogin } from "#lib/activity";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Session = {
  id: string;
  userId: string;
  deviceId: string;
  tokenHash: string;
  sessionVersion: number;
  userAgent: string;
  ip: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export async function createAuthenticatedSession(params: {
  userId: string;
  deviceKey?: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<{ token: string; deviceKey: string }> {
  const { userId, deviceKey, userAgent = null, ip = null } = params;

  const { device, deviceKey: finalDeviceKey } = await ensureDevice({
    userId,
    existingDeviceKey: deviceKey,
    userAgent,
    ip,
  });

  await db.orm.public.Session.where({ userId: userId }).delete();

  const user = await db.orm.public.User.where({ id: userId }).first();
  const sessionVersion = user?.sessionVersion ?? 0;

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await db.orm.public.Session.create({
    userId,
    deviceId: device.id,
    tokenHash,
    sessionVersion,
    userAgent: userAgent ?? "",
    ip: ip ?? "unknown",
    expiresAt,
  });

  return { token: rawToken, deviceKey: finalDeviceKey };
}

export async function signIn(userId: string): Promise<void> {
  const { token, deviceKey } = await createAuthenticatedSession({
    userId,
    deviceKey: getDeviceKey(),
    userAgent: getRequestHeader("user-agent"),
    ip: getRequestIP(),
  });

  setSessionCookie(token);
  setDeviceCookie(deviceKey);

  await recordLogin(userId);
}

export async function invalidateAllSessions(userId: string): Promise<void> {
  await db.runtime().execute(
    db.sql.public.User.update((f, fns) => ({
      sessionVersion: fns.raw`${f.sessionVersion} + 1`.returns({
        codecId: "pg/int4@1",
      }),
    }))
      .where((f, fns) => fns.eq(f.id, userId))
      .build(),
  );
}

export async function validateSession(
  rawToken: string,
): Promise<{ session: Session; user: User } | null> {
  const tokenHash = hashToken(rawToken);

  const session = await db.orm.public.Session.where({ tokenHash })
    .include("user", (u) => u.select(...PUBLIC_COLUMNS))
    .first();
  if (!session) return null;
  if (session.revokedAt) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  const { user } = session;
  if (user.sessionVersion !== session.sessionVersion) return null;

  return { session, user };
}

export async function revokeSession(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await db.orm.public.Session.where({ tokenHash }).update({
    revokedAt: new Date().toISOString(),
  });
}
