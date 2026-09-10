import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "#lib/query-keys";
import {
  listNotificationsFn,
  unreadCountFn,
  markNotificationReadFn,
  markAllNotificationsReadFn,
  deleteNotificationFn,
  sendNotificationFn,
  listSentNotificationsFn,
  deleteNotificationBatchFn,
  listSelectableUsersFn,
} from "#server/notifications.functions";
import type { SendNotificationValues } from "#schemas/auth";

/**
 * 通知的 query / mutation。
 *
 * 轮询节奏与 useSessionGuard 一致（30s）—— 用户已经在忍受那个延迟，
 * 通知用同一节奏不会引入新的感知差异。
 */

/** 未读数。30s 轮询 + 窗口聚焦时立即刷新。 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: () => unreadCountFn(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    // 未读数是轻查询，没必要每次失败就重试三次
    retry: 1,
  });
}

/** 通知列表。只在铃铛打开时启用（enabled 由调用方控制）。 */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.notificationsList,
    queryFn: () => listNotificationsFn(),
    enabled,
    staleTime: 10_000,
  });
}

/** 让列表与未读数一起失效（任一操作后都要）。 */
function useInvalidateNotifications() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.notificationsList }),
      qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
    ]);
}

export function useMarkReadMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (recipientId: string) => markNotificationReadFn({ data: { recipientId } }),
    onSuccess: invalidate,
    // 静默失败：点一下已读没成功不值得弹错误打断用户，下次轮询会纠正
    onError: () => {},
  });
}

export function useMarkAllReadMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => markAllNotificationsReadFn(),
    onSuccess: () => {
      void invalidate();
      toast.success("已全部标记为已读");
    },
    onError: () => toast.error("操作失败，请稍后重试"),
  });
}

export function useDeleteNotificationMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (recipientId: string) => deleteNotificationFn({ data: { recipientId } }),
    onSuccess: invalidate,
    onError: () => toast.error("删除失败，请稍后重试"),
  });
}

// ============================================================
// 管理侧
// ============================================================

/** 已发出的通知（含收件数 / 已读数）。 */
export function useSentNotifications() {
  return useQuery({
    queryKey: queryKeys.sentNotifications,
    queryFn: () => listSentNotificationsFn(),
    staleTime: 10_000,
  });
}

/** 发通知时可选的师生名单。 */
export function useSelectableUsers() {
  return useQuery({
    queryKey: queryKeys.selectableUsers,
    queryFn: () => listSelectableUsersFn(),
    staleTime: 60_000,
  });
}

export function useSendNotificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendNotificationValues) => sendNotificationFn({ data }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.sentNotifications });
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
      toast.success("通知已发送");
    },
    onError: (e: Error) => {
      if (e.message.includes("forbidden")) {
        toast.error("权限不足，请重新登录");
        return;
      }
      if (e.message.includes("no_recipients")) {
        toast.error("没有匹配的收件人，请检查发送目标");
        return;
      }
      if (e.message.includes("too_many_recipients")) {
        toast.error("收件人过多，请分批发");
        return;
      }
      toast.error("发送失败，请稍后重试");
    },
  });
}

export function useDeleteNotificationBatchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => deleteNotificationBatchFn({ data: { notificationId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.sentNotifications });
      void qc.invalidateQueries({ queryKey: queryKeys.notifications });
      toast.success("已撤回");
    },
    onError: () => toast.error("撤回失败，请稍后重试"),
  });
}
