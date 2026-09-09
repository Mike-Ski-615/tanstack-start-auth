import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import type { CookieSerializeOptions } from "cookie-es";

/** cookie 名：只存不透明会话令牌。 */
export const SESSION_COOKIE_NAME = "session-token";

/** 7 天（秒）。 */
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

const COOKIE_OPTIONS: CookieSerializeOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

/** 设置会话 cookie（存原始令牌）。 */
export function setSessionCookie(token: string): void {
  setCookie(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);
}

/** 读取会话令牌，不存在返回 undefined。 */
export function getSessionToken(): string | undefined {
  return getCookie(SESSION_COOKIE_NAME);
}

/** 清除会话 cookie。 */
export function clearSessionCookie(): void {
  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
}
