import type { User } from "./current-user";
import { getSessionToken, clearSessionCookie } from "./session";
import { validateSession } from "./session-manager";
import { touchLastSeen } from "./device";
import { ERROR_MESSAGE } from "#lib/error-messages";

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

/**
 * 要求会话存在，返回当前用户 id；无会话则抛 UNAUTHENTICATED。
 *
 * 与 `getCurrentUser` 是同一个 module 的两个出口，差别只在「没有会话时怎么办」：
 *
 * - `getCurrentUser` 返回 null —— 三个调用点需要这个形状，它们**不能抛**。
 *   最要紧的是 getUserFn：客户端的 useSessionGuard 靠 30 秒轮询它拿到 null
 *   来发现会话失效（见 CONTEXT.md），抛了就变成报错而不是「已登出」。
 *   listSessionsFn（返回空壳）与 getUserById（返回 null）同理。
 * - `requireUserId` 抛错 —— 写操作的形状。
 *
 * 之前这段判空在 5 个写接口里各写一遍，其中一处还被复制成
 * notifications.functions.ts 的私有 `requireUserId()`。同一份 auth 仪式
 * 只该有一个归属。
 *
 * 与 `admin-guard.ts` 的 `requireAdmin()` 平级 —— 两者构成
 * 「谁在调用这个接口」这一层的全部出口。
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error(ERROR_MESSAGE.UNAUTHENTICATED);
  return user.id;
}
