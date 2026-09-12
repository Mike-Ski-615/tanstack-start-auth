import type { User } from "#lib/auth/current-user";
import { getSessionToken, clearSessionCookie } from "#lib/auth/session";
import { validateSession } from "#lib/auth/session-manager";
import { touchLastSeen } from "#lib/auth/device";

/**
 * TanStack Start runs every server function inside a per-request
 * AsyncLocalStorage store. Reusing it as the memo key means a single page
 * render (beforeLoad + loaders firing several server functions) resolves the
 * session once instead of once per function.
 *
 * #ponytail: reaching for the store by its well-known symbol because Start
 * does not export it. If it ever disappears we just lose the dedup, not
 * correctness — the code falls back to validating on every call.
 */
const EVENT_STORAGE = Symbol.for("tanstack-start:event-storage");

type RequestStore = { h3Event?: unknown; __currentUser?: Promise<User | null> };

function getRequestStore(): RequestStore | undefined {
  const storage = (globalThis as Record<symbol, unknown>)[EVENT_STORAGE] as
    { getStore?: () => RequestStore | undefined } | undefined;
  return storage?.getStore?.();
}

export function getCurrentUser(): Promise<User | null> {
  const store = getRequestStore();
  if (!store) return loadCurrentUser();
  return (store.__currentUser ??= loadCurrentUser());
}

async function loadCurrentUser(): Promise<User | null> {
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
