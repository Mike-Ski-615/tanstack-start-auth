// src/lib/query-keys.ts

/**
 * Query key 集中定义。
 *
 * 散在各处写字符串 key 是重复请求的常见来源：`beforeLoad` 写成
 * ["current-user"]、hook 里写成 ["session-guard"]，两处就永远命不中同一份缓存。
 */
export const queryKeys = {
  /** 当前登录用户（未登录为 null）。beforeLoad 与 useSessionGuard 共用。 */
  currentUser: ["current-user"] as const,
  /** 隐私与安全页的会话/设备信息。 */
  securityInfo: ["security-info"] as const,
};
