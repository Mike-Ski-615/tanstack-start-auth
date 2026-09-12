import { createMiddleware } from "@tanstack/react-start";
import { ERROR_MESSAGE } from "#lib/error-messages";
import { getCurrentUser } from "#lib/auth/guard";

export const withUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
  return next({ context: { user: await getCurrentUser() } });
});

export const requireUser = createMiddleware({ type: "function" })
  .middleware([withUser])
  .server(async ({ next, context }) => {
    const { user } = context;
    if (!user) throw new Error(ERROR_MESSAGE.UNAUTHENTICATED);
    return next({ context: { user } });
  });

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([withUser])
  .server(async ({ next, context }) => {
    const { user } = context;
    if (!user || user.role !== "admin") throw new Error(ERROR_MESSAGE.FORBIDDEN);
    return next({ context: { user } });
  });
