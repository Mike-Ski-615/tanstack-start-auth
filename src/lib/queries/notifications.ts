import { queryOptions } from "@tanstack/react-query";
import {
  listNotificationsFn,
  unreadCountFn,
  listSentNotificationsFn,
  listSelectableUsersFn,
} from "#server/notifications.functions";

export const notificationsListQueryOptions = queryOptions({
  queryKey: ["notifications", "list"] as const,
  queryFn: () => listNotificationsFn(),
});

export const notificationsUnreadQueryOptions = queryOptions({
  queryKey: ["notifications", "unread"] as const,
  queryFn: () => unreadCountFn(),
});

export const sentNotificationsQueryOptions = queryOptions({
  queryKey: ["sent-notifications"] as const,
  queryFn: () => listSentNotificationsFn(),
});

export const selectableUsersQueryOptions = queryOptions({
  queryKey: ["selectable-users"] as const,
  queryFn: () => listSelectableUsersFn(),
});

export const notificationsQueryKey = ["notifications"] as const;
