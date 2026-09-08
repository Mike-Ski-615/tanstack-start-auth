// src/lib/auth/get-user-id-from-request.ts

import { getSessionFromRequest } from "#lib/auth/get-session-from-request";

export async function getUserIdFromRequest(request: Request) {
  const session = await getSessionFromRequest(request);

  return session;
}
