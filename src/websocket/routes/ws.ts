import { defineWebSocketHandler } from "nitro";
import { getUserIdFromRequest } from "#lib/auth/get-user-id-from-request";
import { db } from "#prisma/db";
import type { Char } from "@prisma/orm-postgres/target/codec-types";

/**
 * WS peer 上下文类型。
 * 在 upgrade 阶段设置，在 open/close 阶段读取。
 */
interface WsPeerContext {
  userId: string;
  sessionId: string;
}

/**
 * WebSocket 连接追踪（单实例内存版）。
 *
 * 多实例部署时需替换为 Redis / DB 方案。
 *
 * 结构：
 * - peersBySession: sessionId → Set<peerId>（支持 kick）
 * - peersByUser: userId → Set<peerId>（支持 presence）
 * - peerRefs: peerId → peer 引用（支持 close）
 *
 * 修复 race：
 * - open A → open B → close A 时，B 仍存活，status 应为 online
 * - Session revoke → kick 所有关联 WS
 */

const peersBySession = new Map<string, Set<string>>();
const peersByUser = new Map<string, Set<string>>();
const peerRefs = new Map<string, { peer: any; userId: string; sessionId: string }>();

const WS_CLOSE_SESSION_REPLACED = 4001;

/**
 * 踢掉指定 Session 的所有 WebSocket 连接。
 * 在 Session 被 revoke / replace 时调用。
 */
export function kickSession(sessionId: string): void {
  const peerIds = peersBySession.get(sessionId);
  if (!peerIds || peerIds.size === 0) return;

  // 复制一份因为 close 会触发 handler 修改 Set
  const ids = [...peerIds];
  for (const peerId of ids) {
    const ref = peerRefs.get(peerId);
    if (ref) {
      try {
        ref.peer.close(WS_CLOSE_SESSION_REPLACED, "session_replaced");
      } catch {
        // peer 可能已关闭，忽略
      }
    }
  }
}

/**
 * 踢掉指定用户的所有 WebSocket 连接。
 * 在 revokeAllSessions 时调用。
 */
export function kickAllSessionsForUser(userId: string): void {
  const peerIds = peersByUser.get(userId);
  if (!peerIds || peerIds.size === 0) return;

  // 复制一份因为 close 会触发 handler 修改 Set
  const ids = [...peerIds];
  for (const peerId of ids) {
    const ref = peerRefs.get(peerId);
    if (ref) {
      try {
        ref.peer.close(WS_CLOSE_SESSION_REPLACED, "all_sessions_revoked");
      } catch {
        // peer 可能已关闭，忽略
      }
    }
  }
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

    // 注册 peer 引用
    peerRefs.set(peerId, { peer, userId, sessionId });

    // 注册到 session 索引
    if (!peersBySession.has(sessionId)) {
      peersBySession.set(sessionId, new Set());
    }
    peersBySession.get(sessionId)!.add(peerId);

    // 注册到 user 索引
    if (!peersByUser.has(userId)) {
      peersByUser.set(userId, new Set());
    }
    peersByUser.get(userId)!.add(peerId);

    // 只有第一个连接才更新 status → 避免重复写入
    if (peersByUser.get(userId)!.size === 1) {
      await db.orm.public.User.where({ id: userId as Char<36> }).update({
        status: "online",
      });
    }

    console.log(`[WS] ${userId} 上线了 (session: ${sessionId}, peers: ${peersByUser.get(userId)!.size})`);
  },

  async close(peer, details) {
    const ctx = peer.context as unknown as WsPeerContext;
    const userId = ctx.userId;
    const sessionId = ctx.sessionId;
    const peerId = peer.id;

    // 清理 peer 引用
    peerRefs.delete(peerId);

    // 从 session 索引移除
    const sessionPeers = peersBySession.get(sessionId);
    if (sessionPeers) {
      sessionPeers.delete(peerId);
      if (sessionPeers.size === 0) {
        peersBySession.delete(sessionId);
      }
    }

    // 从 user 索引移除
    const userPeers = peersByUser.get(userId);
    if (userPeers) {
      userPeers.delete(peerId);
      if (userPeers.size === 0) {
        peersByUser.delete(userId);
      }
    }

    // 只有最后一个连接关闭时才更新 status → offline
    const remaining = peersByUser.get(userId)?.size ?? 0;
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
