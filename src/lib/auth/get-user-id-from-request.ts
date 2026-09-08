import { getSession, H3Event } from "h3-v2";

import type { Char } from "@prisma/orm-postgres/target/codec-types";

import { appSessionConfig, type SessionData } from "#lib/auth/session";

export async function getUserIdFromRequest(
  request: Request,
): Promise<Char<36> | null> {
  const event = new H3Event(request);

  const session = await getSession<SessionData>(event, appSessionConfig);

  return session.data.userId ?? null;
}
