import { defineWebSocketHandler } from "nitro";
import { getUserIdFromRequest } from "#lib/auth/get-user-id-from-request";
import { db } from "#prisma/db";
import {
  registerPeer,
  unregisterPeer,
  getUserConnectionCount,
} from "#lib/auth/ws-registry";

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
    const peerId = peer.id;

    // 注册到共享注册表
    registerPeer(peerId, userId, sessionId, peer);

    // 只有第一个连接才更新 status → 避免重复写入
    if (getUserConnectionCount(userId) === 1) {
      await db.orm.public.User.where({ id: userId }).update({
        status: "online",
      });
    }

    console.log(`[WS] ${userId} 上线了 (session: ${sessionId}, peers: ${getUserConnectionCount(userId)})`);
  },

  async close(peer, details) {
    const { userId } = getPeerContext(peer);
    const peerId = peer.id;

    // 从共享注册表注销
    unregisterPeer(peerId);

    // 只有最后一个连接关闭时才更新 status → offline
    const remaining = getUserConnectionCount(userId);
    if (remaining === 0) {
      await db.orm.public.User.where({ id: userId }).update({
        status: "offline",
      });
    }

    console.log(`[WS] ${userId} 下线了 (${details.code}, peers: ${remaining})`);
  },

  error(peer, error) {
    console.error("[WS] ERROR", peer.id, error);
  },
});
