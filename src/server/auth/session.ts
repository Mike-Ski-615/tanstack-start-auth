import crypto from "node:crypto";

import {
  getRequestHeader,
  setResponseHeader,
} from "@tanstack/react-start/server";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { db } from "#prisma/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const SESSION_COOKIE = "__Host-session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getSessionToken(): string | null {
  const cookieHeader = getRequestHeader("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(/;\s*/)) {
    const index = part.indexOf("=");
    if (index === -1) continue;

    if (part.slice(0, index) === SESSION_COOKIE) {
      return part.slice(index + 1);
    }
  }

  return null;
}

export async function createSession(
  userId: Char<36>,
  tx?: Tx,
): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await (tx ?? db).orm.public.Session.create({
    tokenHash,
    userId,
    expiresAt: expiresAt.toISOString(),
  });

  return token;
}

export async function getSession() {
  const token = getSessionToken();
  if (!token) return null;

  const tokenHash = hashSessionToken(token);

  const session = await db.orm.public.Session.where({
    tokenHash,
  }).first();

  if (!session || session.revokedAt !== null) {
    return null;
  }

  if (new Date(session.expiresAt) <= new Date()) {
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await db.orm.public.User.where({
    id: session.userId,
  }).first();

  if (!user) return null;

  return { session, user };
}

export async function revokeAllSessions(
  userId: Char<36>,
  tx?: Tx,
): Promise<number> {
  return (tx ?? db).orm.public.Session.where({
    userId,
    revokedAt: null,
  }).updateAndCount({
    revokedAt: new Date().toISOString(),
  });
}

export async function revokeSession(
  sessionId: Char<36>,
  tx?: Tx,
): Promise<void> {
  await (tx ?? db).orm.public.Session.where({
    id: sessionId,
  }).update({
    revokedAt: new Date().toISOString(),
  });
}

function serializeSessionCookie(value: string, maxAge: number): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

export function setSessionCookie(token: string): void {
  setResponseHeader("Set-Cookie", serializeSessionCookie(token, SESSION_MAX_AGE));
}

export function clearSessionCookie(): void {
  setResponseHeader("Set-Cookie", serializeSessionCookie("", 0));
}
