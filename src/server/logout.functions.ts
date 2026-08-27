import { createServerFn } from "@tanstack/react-start";

import { authMiddleware } from "./auth/auth.middleware";

import { signOut } from "./auth/use-cases";

export const logout = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await signOut(context.session.id);

    return {
      ok: true,
    };
  });
