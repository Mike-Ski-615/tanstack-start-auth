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
  /**
   * 管理员用户列表的前缀。
   *
   * 用前缀而非「学生」「教师」两个独立 key：改角色会让同一个人从一个
   * 列表消失、出现在另一个列表里，两边都必须失效。invalidate 这个前缀
   * 一次搞定。具体列表用 adminUsersList(role)。
   */
  /**
   * 当前用户的通知列表。未读数用同一个前缀下的单独 key —— 30s 轮询只
   * 拉未读数（轻），打开铃铛才拉列表（重）。
   */
  notifications: ["notifications"] as const,
  notificationsList: ["notifications", "list"] as const,
  notificationsUnread: ["notifications", "unread"] as const,
  /** 管理员：已发出的通知（含统计）。 */
  sentNotifications: ["sent-notifications"] as const,
  /** 管理员：发通知时可选的师生名单。 */
  selectableUsers: ["selectable-users"] as const,
  adminUsers: ["admin-users"] as const,
  /** 某个角色的用户列表。 */
  adminUsersList: (role: "student" | "teacher") => ["admin-users", role] as const,
  /** 某个用户的公开资料（用户主页）。 */
  userById: (userId: string) => ["user", userId] as const,
};
