import { createMiddleware } from "@tanstack/react-start";

import { getCurrentUser } from "./current-user";

export const authMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const result = await getCurrentUser();

  if (!result) {
    throw new Error("Unauthorized");
  }

  return next({
    context: {
      session: result.session,
      user: result.user,
    },
  });
});
