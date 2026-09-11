// src/hooks/use-session-guard.ts
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { currentUserQueryOptions } from "#lib/queries/current-user";

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
 *
 * 复用 currentUserQueryOptions：与 beforeLoad 的 ensureQueryData 同 key，
 * 进页时的那次查询直接命中缓存，不会重复请求。
 *
 * 四种状态各有处理（这是守卫的全部意义）：
 *   isPending  首次查询中      -> 不动作（还没结果，不该跳）
 *   data=null  会话已失效      -> 跳登录页
 *   data=User  已登录          -> 不动作
 *   error      查不出来        -> **不能静默放行**，见下
 *
 * 为什么失败要单独处理：原来的实现只判 `data === null`，于是查询挂了
 * （网络断开 / 服务端 500）跟「已登录」在守卫眼里完全一样 —— 守卫等于
 * 不存在。但也不能一失败就跳登录页：网络抖一下就被登出，体验很差，
 * 而会话可能其实完好。
 *
 * 所以：失败先重试，重试完仍失败才当作「无法确认会话」送出登录页。
 * 宁可一次误登出，也不要「以为已登出却还能用」—— 后者让用户在一个服务端
 * 已经不认的会话上继续操作，后续每个请求都失败，比直接登出更难懂。
 *
 * ponytail: 30s 轮询，需要更快感知就调小 SESSION_POLL_INTERVAL_MS（代价是请求量）。
 */
export function useSessionGuard() {
  const navigate = useNavigate();

  const { data, error } = useQuery({
    ...currentUserQueryOptions,
    refetchInterval: SESSION_POLL_INTERVAL_MS,
    // 切回标签页时立刻查一次，避免「切回来还要等一个轮询周期」
    refetchOnWindowFocus: true,
    // 覆盖 currentUserQueryOptions 里的 retry: false。
    // 那个 false 是为「返回 null（= 确定未登录）」设的 —— 那种情况重试无意义；
    // 但这里是守卫，需要区分「确定未登录」与「查不出来」。
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (data === null) {
      toast.error("账号已在其他设备登录，请重新登录");
      navigate({ to: "/auth/login" });
      return;
    }

    // 重试后仍失败：无法确认会话，保守处理。
    if (error) {
      toast.error("无法确认登录状态，请重新登录");
      navigate({ to: "/auth/login" });
    }
  }, [data, error, navigate]);
}
