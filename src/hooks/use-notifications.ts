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
 * 轮询节奏与 useSessionGuard 完全一致（同一个常量思路、同样的注释口径），
 * 理由也一样：通知的变化是低频事件，为它上长连接不值得。
 *
 * ponytail: 30s 轮询，需要更快感知就调小 NOTIFICATION_POLL_INTERVAL_MS
 * （代价是请求量）。
 */

/** 轮询间隔（毫秒）。与 SESSION_POLL_INTERVAL_MS 取同一值。 */
const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

/** 未读数。轮询 + 窗口聚焦时立即刷新。 */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: () => unreadCountFn(),
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
    // 切回标签页时立刻查一次，避免「切回来还要等一个轮询周期」
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

/**
 * 让通知相关的所有缓存失效。
 *
 * 包含 sentNotifications（管理员的已发列表）—— 它在**同一个浏览器里**
 * 切换账号时会派上用场：管理员看完学生视角再切回来，阅读统计要是新的。
 *
 * 但注意这解决不了跨客户端的问题：学生在自己电脑上标已读，管理员的
 * 浏览器不会收到任何通知，只能靠 sentNotifications 的轮询。两者都要有。
 */
function useInvalidateNotifications() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.notificationsList }),
      qc.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
      qc.invalidateQueries({ queryKey: queryKeys.sentNotifications }),
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

/**
 * 已发出的通知（含收件数 / 已读数）。
 *
 * 带轮询：阅读情况是**别人**（收件人）产生的数据，本客户端无从得知何时变化。
 * 与未读数同节奏（30s），保持一致的感知延迟。
 */
export function useSentNotifications() {
  return useQuery({
    queryKey: queryKeys.sentNotifications,
    queryFn: () => listSentNotificationsFn(),
    staleTime: 10_000,
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
    // 切回标签页时立刻查一次
    refetchOnWindowFocus: true,
  });
}

/** 发通知时可选的师生名单。 */
export function useSelectableUsers() {
  return useQuery({
    queryKey: queryKeys.selectableUsers,
    queryFn: () => listSelectableUsersFn(),
    staleTime: 60_000,
    // 新增/删除用户后名单会变；管理页轮询间隔内切回本页时刷新一次
    refetchOnWindowFocus: true,
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
