import { createServerFn } from "@tanstack/react-start";
import { db } from "#prisma/db";
import { requireUser, withUser } from "#lib/auth/middleware";
import { invalidateAllSessions } from "#lib/auth/session-manager";

export const listSessionsFn = createServerFn({
  method: "GET",
})
  .middleware([withUser])
  .handler(async ({ context }) => {
    const { user } = context;
    if (!user) return { device: null, session: null, emailVerifiedAt: null };

    const [device, session] = await Promise.all([
      db.orm.public.Device.where({ userId: user.id })
        .select("id", "name", "platform", "userAgent", "ip", "lastSeenAt", "createdAt")
        .first(),
      db.orm.public.Session.where({ userId: user.id })
        .select("id", "sessionVersion", "createdAt", "expiresAt")
        .first(),
    ]);

    return {
      device: device ?? null,
      session: session ?? null,
      emailVerifiedAt: user.emailVerifiedAt,
    };
  });

export const revokeAllSessionsFn = createServerFn({
  method: "POST",
})
  .middleware([requireUser])
  .handler(async ({ context }) => {
    await invalidateAllSessions(context.user.id);

    return { success: true as const };
  });
