import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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

const NOTIFICATION_POLL_INTERVAL_MS = 30_000;

export function useUnreadCount(refetchInterval?: number) {
  return useQuery({
    ...notificationsUnreadQueryOptions,
    refetchInterval,
  });
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    ...notificationsListQueryOptions,
    enabled,
    staleTime: 10_000,
  });
}

function useInvalidateNotifications() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: notificationsQueryKey });
}

export function useMarkReadMutation() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (recipientId: string) => markNotificationReadFn({ data: { recipientId } }),
    onSuccess: invalidate,
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

export function useSentNotifications() {
  return useQuery({
    ...sentNotificationsQueryOptions,
    staleTime: 10_000,
  });
}

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

export function useUpdateNotificationPrefsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notifyOnNewMessage: boolean) =>
      updateNotificationPrefsFn({ data: { notifyOnNewMessage } }),
    onMutate: async (notifyOnNewMessage) => {
      await qc.cancelQueries({ queryKey: currentUserQueryOptions.queryKey });

      const previous = qc.getQueryData(currentUserQueryOptions.queryKey);

      qc.setQueryData(currentUserQueryOptions.queryKey, (old) =>
        old ? { ...old, notifyOnNewMessage } : old,
      );

      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(currentUserQueryOptions.queryKey, context.previous);
      }
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("设置已保存");
    },
    onSettled: () => {
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

export function useNewNotificationToast(notifyOnNewMessage: boolean): void {
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount(NOTIFICATION_POLL_INTERVAL_MS);

  const [seen, setSeen] = useState<number | null>(null);

  useEffect(() => {
    if (unread === undefined) return;

    if (seen === null) {
      setSeen(unread);
      return;
    }

    if (unread <= seen) {
      setSeen(unread);
      return;
    }

    const added = unread - seen;
    setSeen(unread);

    if (!notifyOnNewMessage) return;

    toast.info(added === 1 ? "你有一条新通知" : `你有 ${added} 条新通知`, {
      action: {
        label: "查看",
        onClick: () => {
          navigate({ to: "/authenticated/settings/bell" });
        },
      },
    });
  }, [unread, seen, notifyOnNewMessage, navigate]);
}
