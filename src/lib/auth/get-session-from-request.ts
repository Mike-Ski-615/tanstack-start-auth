import { appSessionConfig, type SessionData } from "#lib/auth/session";
import { getSession, H3Event } from "h3-v2";

/**
 * 从任意 Web Request 中读取 app-session。
 *
 * 与 TanStack Start 的 useAppSession() 使用完全相同的：
 *
 * - cookie name
 * - password
 * - cookie options
 * - SessionData
 *
 * 区别是：
 *
 * useAppSession()
 *   → 从 TanStack Start 当前 request context 获取 H3Event
 *
 * getSessionFromRequest(request)
 *   → 从传入的 Web Request 创建 H3Event
 */
export async function getSessionFromRequest(request: Request) {
  const event = new H3Event(request);

  return getSession<SessionData>(event, appSessionConfig);
}
