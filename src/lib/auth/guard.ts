import type { User } from "#lib/auth/current-user";
import { getSessionToken, clearSessionCookie } from "#lib/auth/session";
import { validateSession } from "#lib/auth/session-manager";
import { touchLastSeen } from "#lib/auth/device";

export async function getCurrentUser(): Promise<User | null> {
  const token = getSessionToken();
  if (!token) return null;

  const result = await validateSession(token);
  if (!result) {
    clearSessionCookie();
    return null;
  }

  void touchLastSeen(result.session.deviceId);

  return result.user;
}
