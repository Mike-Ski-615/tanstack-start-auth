import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { createWsClient } from "#lib/ws-client";
import {
  WS_CLOSE_SESSION_REPLACED,
  WS_CLOSE_ALL_SESSIONS_REVOKED,
} from "#lib/ws-close-codes";

export { WS_CLOSE_SESSION_REPLACED, WS_CLOSE_ALL_SESSIONS_REVOKED };

/**
 * 在线用户集合的模块级 store。
 *
 * 为什么不用 Context：唯一的生产者（useWs）挂在 authenticated 布局，
 * 消费者散落在深层展示组件里。走 Context 要把 provider 塞进布局并让
 * 每个消费者改签名；模块级订阅则是任意组件一行 hook 即可读取，
 * 且 SSR 时天然为空集合（无 WS）。
 */
let onlineUserIds: ReadonlySet<string> = new Set();
const subscribers = new Set<() => void>();

function setOnlineUserIds(next: ReadonlySet<string>) {
  onlineUserIds = next;
  for (const notify of subscribers) notify();
}

/** 读取当前在线用户 id 集合。任意组件可用。 */
export function useOnlineUsers(): ReadonlySet<string> {
  const [, forceUpdate] = useState(0);

  const subscribe = useCallback((notify: () => void) => {
    subscribers.add(notify);
    return () => {
      subscribers.delete(notify);
    };
  }, []);

  useEffect(() => subscribe(() => forceUpdate((n) => n + 1)), [subscribe]);

  return onlineUserIds;
}

/**
 * WebSocket 连接 — 在线状态同步 + 被踢通知。
 *
 * 连接管理（心跳 / 退避 / 重连）全在 lib/ws-client，这里只负责
 * 接到 React 生命周期与 UI 反馈。挂在 authenticated 布局，全站一条连接。
 *
 * 在线状态由服务端全量推送替换，不查 DB —— User.status 字段已废除。
 */
export function useWs(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const client = createWsClient({
      presence: (userIds) => setOnlineUserIds(new Set(userIds)),
      kicked: (code) => {
        setOnlineUserIds(new Set());
        if (code === WS_CLOSE_SESSION_REPLACED) {
          toast.error("你的账号在另一设备登录", {
            description: "当前会话已被替换",
            duration: 5000,
          });
        } else if (code === WS_CLOSE_ALL_SESSIONS_REVOKED) {
          toast.error("所有会话已被撤销", {
            description: "请重新登录",
            duration: 5000,
          });
        }
        navigate({ to: "/auth/login" });
      },
    });

    return () => {
      client.close();
      setOnlineUserIds(new Set());
    };
  }, [navigate]);
}
