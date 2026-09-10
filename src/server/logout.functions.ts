import { createServerFn } from "@tanstack/react-start";
import { revokeSession } from "#lib/auth/session-manager";
import { closeSessionPeers } from "#lib/auth/ws-registry";
import {
  getSessionToken,
  clearSessionCookie,
} from "#lib/auth/session";

/**
 * 登出用例：撤销会话（DB 标记 revokedAt）→ 踢掉该 Session 的 WS → 清 session cookie。
 *
 * 为什么要主动踢 WS：客户端 use-ws 靠组件卸载时 close() 断开，但浏览器直接关
 * 页签 / 崩溃时不会执行卸载回调，服务端只能等 TCP 超时。此期间用户实际已登出，
 * status 却仍是 online（别人看到你在线）。主动 close 让 close handler 立即跑，
 * status 同步落回 offline。
 *
 * 注意：不清 deviceKey cookie。deviceKey 是设备身份，应长期保留。
 * 只有用户明确"删除此设备"时才清除 deviceKey。
 *
 * 无会话调用只是空操作（未登录点了也不报错）。
 */
export const logout = createServerFn({
  method: "POST",
}).handler(async () => {
  const token = getSessionToken();
  if (token) {
    const sessionId = await revokeSession(token);
    if (sessionId) closeSessionPeers(sessionId);
  }
  clearSessionCookie();

  return { success: true };
});
