/**
 * WebSocket 消息协议 — 服务端与客户端共用的唯一真源。
 *
 * 叶子模块：零依赖，两端都能安全 import。
 * 见 CONTEXT.md「WebSocket Presence & Kick」。
 *
 * 线上格式恒为 JSON 文本：{ type, ...payload }。
 * 目前只有心跳与在线状态全量广播；消息通知留待后续在此扩展
 * （新增 type 即可，两侧 switch 会因穷尽性检查报错，不会静默漏处理）。
 */

/** 客户端 → 服务端。 */
export type ClientMessage = { type: "ping" };

/** 服务端 → 客户端。 */
export type ServerMessage =
  | { type: "pong" }
  /**
   * 在线用户 id 全量快照。
   *
   * 单实例 + 中小规模下单次全量最省事：客户端只需整体替换本地集合，
   * 不需要维护订阅与增量合并（那是大流量才需要的优化）。
   * 广播时机为任意连接 open/close 之后。
   */
  | { type: "presence"; userIds: string[] };

/** 心跳间隔：客户端每 25s 发一次 ping（低于常见的 30s/60s 空闲超时）。 */
export const WS_HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * 心跳超时：60s 未收到任何服务端消息即判定连接已死。
 *
 * 为什么不能只依赖 onclose：半开连接（服务端进程被 kill、网络中断）
 * 下浏览器可能数分钟都不触发 close 事件，表现为「以为还连着」。
 */
export const WS_HEARTBEAT_TIMEOUT_MS = 60_000;

/** 重连退避上限。 */
export const WS_RECONNECT_MAX_DELAY_MS = 30_000;
