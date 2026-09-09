import { createServerFn } from "@tanstack/react-start";
import { revokeSession } from "#lib/auth/session-manager";
import {
  getSessionToken,
  clearSessionCookie,
} from "#lib/auth/session";

/**
 * 登出用例：撤销会话（DB 标记 revokedAt）→ 清 session cookie。
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
    await revokeSession(token);
  }
  clearSessionCookie();

  return { success: true };
});
