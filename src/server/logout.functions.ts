import { createServerFn } from "@tanstack/react-start";
import { revokeSession } from "#lib/auth/session-manager";
import { getSessionToken, clearSessionCookie } from "#lib/auth/session";

export const logout = createServerFn({
  method: "POST",
}).handler(async () => {
  const token = getSessionToken();
  if (token) {
    await revokeSession(token);
  }
  clearSessionCookie();

  return { success: true };
});
