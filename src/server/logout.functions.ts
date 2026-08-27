import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "./auth/auth.middleware";

import { clearSessionCookie, revokeSession } from "./auth/session";

export const logout = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await revokeSession(context.session.id);

    clearSessionCookie();

    return {
      ok: true,
    };
  });
