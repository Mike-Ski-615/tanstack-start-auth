import { getSession, useSession } from "@tanstack/react-start/server";

import type { Char } from "@prisma/orm-postgres/target/codec-types";

export type SessionData = {
  userId?: Char<36>;
};

export const appSessionConfig = {
  name: "app-session",

  password: process.env.SESSION_SECRET!,

  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    httpOnly: true,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  },
};

/**
 * 当前请求的会话管理器。
 *
 * 只能在 TanStack Start server request context 中调用。
 */
export function useAppSession() {
  return useSession<SessionData>(appSessionConfig);
}

/**
 * 当前请求的 Session。
 *
 * 只能在 TanStack Start server request context 中调用。
 */
export function getAppSession() {
  return getSession<SessionData>(appSessionConfig);
}
