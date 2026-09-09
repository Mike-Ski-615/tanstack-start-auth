import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import { z } from "zod";
import { db } from "#prisma/db";
import { getCurrentUser } from "#lib/auth/guard";
import { getSessionToken } from "#lib/auth/session";
import { hashToken } from "#lib/auth/token";

/**
 * 当前用户的活跃会话（用于隐私与安全页展示）。
 * 标记当前会话，方便用户识别。
 */
export const listSessionsFn = createServerFn({
  method: "GET",
}).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");

  const user = await getCurrentUser();
  if (!user) return { sessions: [], currentTokenHash: null };

  const now = new Date();
  const sessions = await db.orm.public.Session.where({
    userId: user.id as unknown as string,
  }).select(
    "id",
    "tokenHash",
    "userAgent",
    "ip",
    "createdAt",
    "expiresAt",
    "revokedAt",
  ).all();

  const active = sessions
    .filter((s) => !s.revokedAt && new Date(s.expiresAt).getTime() > now.getTime())
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  const currentToken = getSessionToken();
  const currentTokenHash = currentToken ? hashToken(currentToken) : null;

  return {
    sessions: active.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.tokenHash === currentTokenHash,
    })),
  };
});

const revokeSchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * 撤销指定会话（只能撤销自己的）。
 * 撤销当前会话等于登出。
 */
export const revokeSessionFn = createServerFn({
  method: "POST",
})
  .validator(revokeSchema)
  .handler(async ({ data: { sessionId } }) => {
    setResponseHeader("Cache-Control", "no-store");

    const user = await getCurrentUser();
    if (!user) throw new Error("unauthorized");

    // 只能撤销自己的会话
    const session = await db.orm.public.Session.where({ id: sessionId as Char<36> }).first();
    if (!session || session.userId !== (user.id as unknown as string)) {
      throw new Error("not_found");
    }

    await db.orm.public.Session.where({ id: sessionId as Char<36> }).update({
      revokedAt: new Date().toISOString(),
    });

    return { success: true as const };
  });
