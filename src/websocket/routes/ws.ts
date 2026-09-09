import { defineWebSocketHandler } from "nitro";
import { getUserIdFromRequest } from "#lib/auth/get-user-id-from-request";
import { db } from "#prisma/db";
import type { Char } from "@prisma/orm-postgres/target/codec-types";
import {
  registerPeer,
  unregisterPeer,
  getUserConnectionCount,
} from "#lib/auth/ws-registry";

/**
 * WS peer 上下文类型。
 */
interface WsPeerContext {
  userId: string;
  sessionId: string;
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
        userId: auth.userId as unknown as string,
        sessionId: auth.sessionId as unknown as string,
      },
    };
  },

  async open(peer) {
    const ctx = peer.context as unknown as WsPeerContext;
    const userId = ctx.userId;
    const sessionId = ctx.sessionId;
    const peerId = peer.id;

    // 注册到共享注册表
    registerPeer(peerId, userId, sessionId, peer);

    // 只有第一个连接才更新 status → 避免重复写入
    if (getUserConnectionCount(userId) === 1) {
      await db.orm.public.User.where({ id: userId as Char<36> }).update({
        status: "online",
      });
    }

    console.log(`[WS] ${userId} 上线了 (session: ${sessionId}, peers: ${getUserConnectionCount(userId)})`);
  },

  async close(peer, details) {
    const ctx = peer.context as unknown as WsPeerContext;
    const userId = ctx.userId;
    const peerId = peer.id;

    // 从共享注册表注销
    unregisterPeer(peerId);

    // 只有最后一个连接关闭时才更新 status → offline
    const remaining = getUserConnectionCount(userId);
    if (remaining === 0) {
      await db.orm.public.User.where({ id: userId as Char<36> }).update({
        status: "offline",
      });
    }

    console.log(`[WS] ${userId} 下线了 (${details.code}, peers: ${remaining})`);
  },

  error(peer, error) {
    console.error("[WS] ERROR", peer.id, error);
  },
});
