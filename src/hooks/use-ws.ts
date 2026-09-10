import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  WS_CLOSE_SESSION_REPLACED,
  WS_CLOSE_ALL_SESSIONS_REVOKED,
} from "#lib/ws-close-codes";

export { WS_CLOSE_SESSION_REPLACED, WS_CLOSE_ALL_SESSIONS_REVOKED };

/**
 * WebSocket 客户端钩子 — 实时在线状态 + 被踢通知。
 *
 * 功能：
 * - 连接 WS → 服务端更新 status = online
 * - 被踢（单设备登录）→ Toast + 跳转登录页
 * - 全部撤销 → Toast + 跳转登录页
 * - 异常断线 → 自动重连（3 秒后）
 */
export function useWs() {
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    const connect = () => {
      if (unmountedRef.current) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] 已连接");
      };

      ws.onclose = (event) => {
        console.log("[WS] 连接关闭", event.code, event.reason);

        // 被踢原因码 → Toast + 跳转登录
        if (event.code === WS_CLOSE_SESSION_REPLACED) {
          toast.error("你的账号在另一设备登录", {
            description: "当前会话已被替换",
            duration: 5000,
          });
          navigate({ to: "/auth/login" });
          return;
        }

        if (event.code === WS_CLOSE_ALL_SESSIONS_REVOKED) {
          toast.error("所有会话已被撤销", {
            description: "请重新登录",
            duration: 5000,
          });
          navigate({ to: "/auth/login" });
          return;
        }

        // 其他原因（网络异常等）→ 自动重连
        if (!unmountedRef.current) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        console.warn("[WS] 连接异常");
      };
    };

    connect();

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [navigate]);
}
