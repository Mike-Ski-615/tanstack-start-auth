import { defineWebSocketHandler } from "nitro";
import { getUserIdFromRequest } from "#lib/auth/get-user-id-from-request";
import {
  registerPeer,
  unregisterPeer,
  getUserConnectionCount,
  broadcastPresence,
  getOnlineUserIds,
} from "#lib/auth/ws-registry";
import type { ClientMessage } from "#lib/ws-protocol";

/**
 * WS peer 上下文：由 upgrade 写入，open/close 读出。
 *
 * crossws 的 Hooks 未把 upgrade 的 context 类型泛型传递到 open/close
 * （两者均收到未参数化的 Peer），所以下面用断言+运行校验来桥接。
 */
interface WsPeerContext {
  userId: string;
  sessionId: string;
}

/**
 * 从 peer.context 取出本文件的上下文。
 *
 * 断言收在这里，且带运行校验：upgrade 改了 context 形状而忘了同步这里时，
 * 会当场报错而不是带着 undefined 继续跑（registerPeer 拿到 undefined 后
 * presence / kick 都会静默失效）。
 */
function getPeerContext(peer: { context: Record<string, unknown> }): WsPeerContext {
  const { userId, sessionId } = peer.context;
  if (typeof userId !== "string" || typeof sessionId !== "string") {
    throw new Error("[WS] peer.context 缺少 userId/sessionId，upgrade 与 handler 不一致");
  }
  return { userId, sessionId };
}

/**
 * WebSocket 处理器 — 在线状态 + 被踢通知。
 *
 * 在线状态以本模块的注册表为唯一真源，不写 DB：
 * 进程重启后全员离线（单实例下这是正确语义），也不会像 User.status 那样
 * 留下永久错误的 online。
 */
export default defineWebSocketHandler({
  async upgrade(request) {
    const auth = await getUserIdFromRequest(request);

    if (!auth) {
      return new Response("Unauthorized", {
        status: 401,
      });
    }

    return {
      context: {
        userId: auth.userId,
        sessionId: auth.sessionId,
      },
    };
  },

  async open(peer) {
    const { userId, sessionId } = getPeerContext(peer);

    registerPeer(peer.id, userId, sessionId, peer);

    // 新连接先拿一份快照，否则要等到下一次有人上下线才显示状态
    peer.send(
      JSON.stringify({ type: "presence", userIds: getOnlineUserIds() }),
    );

    // 通知所有人：此人上线了
    broadcastPresence();

    console.log(
      `[WS] ${userId} 上线了 (session: ${sessionId}, peers: ${getUserConnectionCount(userId)})`,
    );
  },

  /**
   * 心跳应答。客户端定时发 { type: "ping" }，服务端回 pong ——
   * 客户端据此判断连接是否真的活着（半开连接下 onclose 可能长时间不触发）。
   */
  message(peer, message) {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message.text()) as ClientMessage;
    } catch {
      return; // 非法 JSON 直接忽略，不当作致命错误断开
    }

    if (parsed?.type === "ping") {
      peer.send(JSON.stringify({ type: "pong" }));
    }
  },

  async close(peer) {
    const { userId } = getPeerContext(peer);

    unregisterPeer(peer.id);

    // 只有该用户最后一个连接关闭才算离线（多标签页场景）
    if (getUserConnectionCount(userId) === 0) {
      broadcastPresence();
    }

    console.log(`[WS] ${userId} 下线了 (peers: ${getUserConnectionCount(userId)})`);
  },

  error(peer, error) {
    console.error("[WS] ERROR", peer.id, error);
  },
});
