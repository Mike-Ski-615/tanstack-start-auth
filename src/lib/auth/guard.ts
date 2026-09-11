import type { User } from "#lib/auth/current-user";
import { getSessionToken, clearSessionCookie } from "#lib/auth/session";
import { validateSession } from "#lib/auth/session-manager";
import { touchLastSeen } from "#lib/auth/device";

/**
 * 请求守卫：校验会话 → 返回当前用户。
 * 会话无效时清除 cookie 并返回 null。
 *
 * 副作用：节流更新 Device.lastSeenAt（5 分钟一次）。
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = getSessionToken();
  if (!token) return null;

  // validateSession 用 Session.user 关系把 User 一起带回来了，这里不必再查一次
  const result = await validateSession(token);
  if (!result) {
    clearSessionCookie();
    return null;
  }

  // 节流更新 lastSeenAt（不阻塞请求）
  void touchLastSeen(result.session.deviceId);

  return result.user;
}
