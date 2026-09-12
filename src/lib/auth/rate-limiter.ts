import { db } from "#prisma/db";
import { setResponseStatus, setResponseHeader } from "@tanstack/react-start/server";
import { ERROR_MESSAGE } from "#lib/error-messages";

const WINDOW_MS = 60_000;

const LIMITS = {
  login: 5,
  register: 3,
  reset: 3,
  resend: 3,
  "verify-otp": 10,
  "reset-verify": 10,
} as const;

type LimitKey = keyof typeof LIMITS;

export interface RateSubject {
  ip?: string | undefined;
  email?: string | undefined;
}

function subjectKey(subject: RateSubject): string {
  const parts: string[] = [];
  if (subject.email !== undefined) parts.push(`email=${subject.email}`);
  if (subject.ip !== undefined) parts.push(`ip=${subject.ip}`);
  return parts.join("|");
}

export async function rateLimit(
  type: LimitKey,
  subject: RateSubject,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const key = `${type}:${subjectKey(subject)}`;
  const max = LIMITS[type];
  const now = new Date();
  const nowIso = now.toISOString();
  const windowStartIso = new Date(now.getTime() - WINDOW_MS).toISOString();
  const expiresAtIso = new Date(now.getTime() + WINDOW_MS).toISOString();

  const plan = db.raw.sql`
    INSERT INTO "public"."RateLimit" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, ${nowIso}::timestamptz, ${expiresAtIso}::timestamptz)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."windowStart" > ${windowStartIso}::timestamptz
        THEN "RateLimit"."count" + 1
        ELSE 1
      END,
      "windowStart" = CASE
        WHEN "RateLimit"."windowStart" > ${windowStartIso}::timestamptz
        THEN "RateLimit"."windowStart"
        ELSE ${nowIso}::timestamptz
      END,
      "expiresAt" = ${expiresAtIso}::timestamptz
    RETURNING "count", "windowStart"
  `
    .returnsRow({
      count: { codecId: "pg/int4@1" },
      windowStart: { codecId: "pg/timestamptz-string@1" },
    })
    .build();

  const [row] = await db.runtime().query(plan);
  const count = row?.count ?? 1;

  return {
    allowed: count <= max,
    remaining: Math.max(0, max - count),
    resetAt: new Date(row?.windowStart ?? nowIso).getTime() + WINDOW_MS,
  };
}

export const RATE_LIMITED = ERROR_MESSAGE.RATE_LIMITED;

export async function enforceRateLimit(type: LimitKey, subject: RateSubject): Promise<void> {
  const { allowed, resetAt } = await rateLimit(type, subject);
  if (allowed) return;

  setResponseStatus(429);
  setResponseHeader("Retry-After", String(Math.ceil((resetAt - Date.now()) / 1000)));
  throw new Error(RATE_LIMITED);
}
