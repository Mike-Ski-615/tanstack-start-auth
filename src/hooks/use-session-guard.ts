// src/hooks/use-session-guard.ts
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getUserFn } from "#server/user.functions";

/** 轮询间隔（毫秒）。被踢后最迟这么久跳登录页。 */
const SESSION_POLL_INTERVAL_MS = 30_000;

/**
 * 会话守卫 — 检测会话失效并跳登录页。
 *
 * 另一设备登录 / 全局登出 / 改密 会让本机会话失效，服务端在
 * validateSession 里校验失败后 getUserFn 返回 null，这里据此跳转登录页。
 *
 * 用轮询 + 窗口聚焦检查，不做长连接：单设备模型下会话失效是低频事件，
 * 30s 的延迟可接受，省掉 WS 的注册表、心跳与重连逻辑。
 * ponytail: 30s 轮询，需要更快感知就调小 SESSION_POLL_INTERVAL_MS（代价是请求量）。
 */
export function useSessionGuard() {
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["session-guard"],
    queryFn: () => getUserFn(),
    refetchInterval: SESSION_POLL_INTERVAL_MS,
    // 切回标签页时立刻查一次，避免「切回来还要等一个轮询周期」
    refetchOnWindowFocus: true,
    // 会话失效是终态，重试没有意义（默认 3 次会让跳转延迟数秒）
    retry: false,
  });

  useEffect(() => {
    if (data === null) {
      toast.error("账号已在其他设备登录，请重新登录");
      navigate({ to: "/auth/login" });
    }
  }, [data, navigate]);
}
