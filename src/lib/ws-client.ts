/**
 * WebSocket 客户端 — 连接管理、心跳、指数退避重连。
 *
 * 不依赖 React：便于单独测试与复用，也避免把重连状态塞进组件 state
 * （那会导致每次状态变更都重建连接）。
 *
 * 见 CONTEXT.md「WebSocket Presence & Kick」。
 */
import {
  WS_HEARTBEAT_INTERVAL_MS,
  WS_HEARTBEAT_TIMEOUT_MS,
  WS_RECONNECT_MAX_DELAY_MS,
  type ClientMessage,
  type ServerMessage,
} from "#lib/ws-protocol";
import {
  WS_CLOSE_SESSION_REPLACED,
  WS_CLOSE_ALL_SESSIONS_REVOKED,
  WS_CLOSE_NORMAL,
} from "#lib/ws-close-codes";

export type WsClientEvents = {
  /** 服务端推送的在线用户快照。 */
  presence: (userIds: string[]) => void;
  /**
   * 连接被服务端主动踢下线（会话被替换 / 全部撤销）。
   * 触发后客户端不再重连 —— 会话已失效，重连只会一直失败。
   */
  kicked: (code: number) => void;
};

export type WsClient = {
  /** 主动断开并停止重连（用于组件卸载 / 主动登出）。 */
  close: () => void;
};

export function createWsClient(events: WsClientEvents): WsClient {
  let socket: WebSocket | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  /** 主动关闭或已被踢：不再重连。 */
  let stopped = false;

  const clearTimers = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    heartbeatTimer = null;
    timeoutTimer = null;
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    // 指数退避 + 抖动：服务端重启时避免所有客户端同时重试（惊群）
    const base = Math.min(
      WS_RECONNECT_MAX_DELAY_MS,
      1000 * 2 ** reconnectAttempt,
    );
    const jittered = base * (0.5 + Math.random() * 0.5);
    reconnectAttempt++;
    reconnectTimer = setTimeout(connect, jittered);
  };

  /** 收到任何服务端消息都重置心跳超时 —— 有流量就说明连接活着。 */
  const armTimeout = () => {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(() => {
      // 超时说明连接已死但 onclose 未触发（半开连接）
      socket?.close();
    }, WS_HEARTBEAT_TIMEOUT_MS);
  };

  const connect = () => {
    if (stopped) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socket = ws;

    ws.onopen = () => {
      reconnectAttempt = 0; // 连上就重置退避
      armTimeout();
      heartbeatTimer = setInterval(() => {
        const msg: ClientMessage = { type: "ping" };
        ws.send(JSON.stringify(msg));
      }, WS_HEARTBEAT_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      armTimeout();
      let parsed: ServerMessage;
      try {
        parsed = JSON.parse(event.data as string) as ServerMessage;
      } catch {
        return;
      }
      if (parsed.type === "presence") {
        events.presence(parsed.userIds);
      }
      // pong 无额外处理：重置超时即已证明连接存活
    };

    ws.onclose = (event) => {
      clearTimers();

      // 被踢：会话已失效，重连没有意义
      if (
        event.code === WS_CLOSE_SESSION_REPLACED ||
        event.code === WS_CLOSE_ALL_SESSIONS_REVOKED
      ) {
        stopped = true;
        events.kicked(event.code);
        return;
      }

      // 正常关闭（主动登出）：静默，由调用方负责 UI
      if (event.code === WS_CLOSE_NORMAL) {
        stopped = true;
        return;
      }

      scheduleReconnect();
    };

    ws.onerror = () => {
      // onerror 后浏览器必定触发 onclose，重连逻辑统一放在那里
    };
  };

  connect();

  return {
    close: () => {
      stopped = true;
      clearTimers();
      if (socket) {
        // 用 1000 告知服务端这是正常关闭，服务端不会当作异常
        socket.close(WS_CLOSE_NORMAL, "client_closed");
        socket = null;
      }
    },
  };
}
