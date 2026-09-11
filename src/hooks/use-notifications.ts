import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  notificationsListQueryOptions,
  notificationsUnreadQueryOptions,
  sentNotificationsQueryOptions,
  selectableUsersQueryOptions,
  notificationsQueryKey,
} from "#lib/queries/notifications";
import { currentUserQueryOptions } from "#lib/queries/user";
import {
  markNotificationReadFn,
  markAllNotificationsReadFn,
  deleteNotificationFn,
  sendNotificationFn,
  deleteNotificationBatchFn,
  updateNotificationPrefsFn,
} from "#server/notifications.functions";
import type { SendNotificationValues } from "#schemas/auth";

/**
 * 通知的 query / mutation。
 *
 * 未读数带轮询（与 useSessionGuard 同节奏）—— 「新通知来了要弹提醒」需要
 * 主动感知，而通知是别人（管理员）产生的数据，本客户端无从得知何时变化。
 *
 * 阅读统计（useSentNotifications）**不轮询**：那是管理员偶尔看一眼的数据，
 * 刷新页面即可，不值得为它持续发请求。
 *
 * ponytail: 30s 轮询，需要更快感知就调小 NOTIFICATION_POLL_INTERVAL_MS
 * （代价是请求量）。
 */

/** 轮询间隔（毫秒）。与 SESSION_POLL_INTERVAL_MS 取同一值。 */
const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

/** 未读数（铃铛徽章）。轮询 + 窗口聚焦时立即刷新。 */
export function useUnreadCount() {
  return useQuery({
    ...notificationsUnreadQueryOptions,
    // 轮询以主动感知别人（管理员）产生的通知 —— 本客户端无从得知何时变化。
    // refetchOnWindowFocus 与 retry 走全局默认（见 router.tsx），不再重复写。
    refetchInterval: NOTIFICATION_POLL_INTERVAL_MS,
  });
}

/** 通知列表。只在铃铛打开时启用（enabled 由调用方控制）。 */
export function useNotifications(enabled: boolean) {
  return useQuery({
    ...notificationsListQueryOptions,
    enabled,
    staleTime: 10_000,
  });
}

/** 让列表与未读数一起失效（任一操作后都要）。 */
function useInvalidateNotifications() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: notificationsQueryKey });
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
  });
}

export function useDeleteNotificationMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (recipientId: string) => deleteNotificationFn({ data: { recipientId } }),
    onSuccess: invalidate,
  });
}

// ============================================================
// 管理侧
// ============================================================

/** 已发出的通知（含收件数 / 已读数）。 */
export function useSentNotifications() {
  return useQuery({
    ...sentNotificationsQueryOptions,
    staleTime: 10_000,
  });
}

/** 发通知时可选的师生名单。 */
export function useSelectableUsers() {
  return useQuery({
    ...selectableUsersQueryOptions,
    staleTime: 60_000,
  });
}

export function useSendNotificationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendNotificationValues) => sendNotificationFn({ data }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sentNotificationsQueryOptions.queryKey });
      void qc.invalidateQueries({ queryKey: notificationsQueryKey });
      toast.success("通知已发送");
    },
  });
}

/** 更新通知偏好（弹不弹 toast）。乐观更新：开关立即翻转，失败回滚。 */
export function useUpdateNotificationPrefsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notifyOnNewMessage: boolean) =>
      updateNotificationPrefsFn({ data: { notifyOnNewMessage } }),
    onMutate: async (notifyOnNewMessage) => {
      // 取消进行中的 currentUser 查询，避免旧数据覆盖乐观值
      await qc.cancelQueries({ queryKey: currentUserQueryOptions.queryKey });

      const previous = qc.getQueryData(currentUserQueryOptions.queryKey);

      // 乐观写入：先翻转，服务端确认前就回显
      qc.setQueryData(currentUserQueryOptions.queryKey, (old) =>
        old ? { ...old, notifyOnNewMessage } : old,
      );

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      // 失败：回滚到乐观写之前的值
      if (context?.previous) {
        qc.setQueryData(currentUserQueryOptions.queryKey, context.previous);
      }
      // 局部 onError 会替代全局默认（见 router.tsx），所以这里要自己 toast
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("设置已保存");
    },
    onSettled: () => {
      // 无论成败：以服务端真值为准（currentUser 里带着这个字段）
      void qc.invalidateQueries({ queryKey: currentUserQueryOptions.queryKey });
    },
  });
}

export function useDeleteNotificationBatchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => deleteNotificationBatchFn({ data: { notificationId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sentNotificationsQueryOptions.queryKey });
      void qc.invalidateQueries({ queryKey: notificationsQueryKey });
      toast.success("已撤回");
    },
  });
}

// ============================================================
// 新通知提醒
// ============================================================

/**
 * 监测新到达的通知并弹 toast。
 *
 * 挂在 authenticated 布局上（登录后一直活着），不挂在铃铛里 —— 铃铛可能
 * 根本没打开过。
 *
 * **只在「未读数上升」时弹，不是「有未读就弹」**：
 * 首次加载时把当前值记为基线，之后每次轮询回来的值比基线大才提示。
 * 否则每次刷新都会把所有旧通知重弹一遍。
 *
 * 用户在设置页关掉开关（notifyOnNewMessage=false）时完全不弹，但**基线
 * 仍要更新** —— 否则开关重新打开时会把关闭期间攒的通知一次性倒出来。
 */
export function useNewNotificationToast(notifyOnNewMessage: boolean): void {
  const { data: unread } = useUnreadCount();

  // 基线：上一次见到的未读数。null = 尚未建立（首次加载）
  const [seen, setSeen] = useState<number | null>(null);

  useEffect(() => {
    if (unread === undefined) return;

    // 首次拿到数据：只记基线，不弹
    if (seen === null) {
      setSeen(unread);
      return;
    }

    // 未读数下降（用户标已读 / 删除）→ 只更新基线
    if (unread <= seen) {
      setSeen(unread);
      return;
    }

    const added = unread - seen;
    setSeen(unread);

    // 开关关着就不打扰 —— 但基线已经更新，不会在重新打开时补弹
    if (!notifyOnNewMessage) return;

    toast.info(added === 1 ? "你有一条新通知" : `你有 ${added} 条新通知`, {
      action: {
        label: "查看",
        // 跳到设置页的通知历史（完整列表）。
        // 不用 router.navigate：这个 hook 在布局层，拿 navigate 会让它依赖
        // 路由上下文；location.assign 走一次整页加载，但用户点「查看」是
        // 低频操作，代价可接受。
        onClick: () => {
          window.location.assign("/authenticated/settings/bell");
        },
      },
    });
  }, [unread, seen, notifyOnNewMessage]);
}
