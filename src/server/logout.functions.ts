import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "./auth/auth.middleware";

import { endSession } from "./auth/session";

export const logout = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await endSession(context.session.id);

    return {
      ok: true,
    };
  });
