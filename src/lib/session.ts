import { useSession } from "@tanstack/react-start/server";

/**
 * 会话数据形态：无状态加密 cookie（iron-session 风格），
 * 全部数据加密后存放在 HTTP-only cookie 中，服务端无会话存储。
 */
type SessionData = {
  userId?: string;
};

/**
 * 当前请求的会话管理器（仅在服务端上下文可用）。
 *
 * - `session.data` 读取会话数据
 * - `session.update(...)` 写入会话数据并下发 Set-Cookie
 * - `session.clear()` 清除会话并下发过期 Set-Cookie
 */
export function useAppSession() {
  return useSession<SessionData>({
    name: "app-session",
    password: process.env.SESSION_SECRET!, // 至少 32 字符
    cookie: {
      secure: process.env.NODE_ENV === "production", // 生产仅 HTTPS
      sameSite: "lax", // 防 CSRF
      httpOnly: true, // 防 XSS，前端 JS 读不到
      path: "/", // 全站有效
      maxAge: 7 * 24 * 60 * 60, // 7 天
    },
  });
}
