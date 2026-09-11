import { queryOptions } from "@tanstack/react-query";
import {
  listNotificationsFn,
  unreadCountFn,
  listSentNotificationsFn,
  listSelectableUsersFn,
} from "#server/notifications.functions";

/** 通知列表（完整，含已读）。 */
export const notificationsListQueryOptions = queryOptions({
  queryKey: ["notifications", "list"] as const,
  queryFn: () => listNotificationsFn(),
});

/** 未读数（铃铛徽章）。 */
export const notificationsUnreadQueryOptions = queryOptions({
  queryKey: ["notifications", "unread"] as const,
  queryFn: () => unreadCountFn(),
});

/** 管理员：已发出的通知（含统计）。 */
export const sentNotificationsQueryOptions = queryOptions({
  queryKey: ["sent-notifications"] as const,
  queryFn: () => listSentNotificationsFn(),
});

/** 管理员：发通知时可选的师生名单。 */
export const selectableUsersQueryOptions = queryOptions({
  queryKey: ["selectable-users"] as const,
  queryFn: () => listSelectableUsersFn(),
});

/** 通知前缀：让列表与未读数一起失效（任一操作后都要）。 */
export const notificationsQueryKey = ["notifications"] as const;
