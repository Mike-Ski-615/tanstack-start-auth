import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import type { CookieSerializeOptions } from "cookie-es";

export const SESSION_COOKIE_NAME = "session-token";

export const DEVICE_COOKIE_NAME = "device_key";

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

const COOKIE_OPTIONS: CookieSerializeOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

export function setSessionCookie(token: string): void {
  setCookie(SESSION_COOKIE_NAME, token, COOKIE_OPTIONS);
}

export function getSessionToken(): string | undefined {
  return getCookie(SESSION_COOKIE_NAME);
}

export function clearSessionCookie(): void {
  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
}

export function setDeviceCookie(deviceKey: string): void {
  setCookie(DEVICE_COOKIE_NAME, deviceKey, COOKIE_OPTIONS);
}

export function getDeviceKey(): string | undefined {
  return getCookie(DEVICE_COOKIE_NAME);
}
