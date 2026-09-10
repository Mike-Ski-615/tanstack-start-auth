/**
 * WebSocket 连接追踪 — 内存注册表。
 *
 * 供 server functions 调用 kickSession / kickAllSessionsForUser。
 * WS handler (ws.ts) 在连接建立/关闭时更新此注册表。
 *
 * 多实例部署时需替换为 Redis。
 */

import {
  WS_CLOSE_SESSION_REPLACED,
  WS_CLOSE_ALL_SESSIONS_REVOKED,
} from "#lib/ws-close-codes";

export {
  WS_CLOSE_SESSION_REPLACED,
  WS_CLOSE_ALL_SESSIONS_REVOKED,
};

const peersBySession = new Map<string, Set<string>>();
const peersByUser = new Map<string, Set<string>>();
const peerRefs = new Map<string, { peer: any; userId: string; sessionId: string }>();

/** 注册新 WS 连接。由 ws.ts open handler 调用。 */
export function registerPeer(peerId: string, userId: string, sessionId: string, peer: any): void {
  peerRefs.set(peerId, { peer, userId, sessionId });

  if (!peersBySession.has(sessionId)) {
    peersBySession.set(sessionId, new Set());
  }
  peersBySession.get(sessionId)!.add(peerId);

  if (!peersByUser.has(userId)) {
    peersByUser.set(userId, new Set());
  }
  peersByUser.get(userId)!.add(peerId);
}

/** 注销 WS 连接。由 ws.ts close handler 调用。 */
export function unregisterPeer(peerId: string): void {
  const ref = peerRefs.get(peerId);
  if (!ref) return;

  const { userId, sessionId } = ref;

  peerRefs.delete(peerId);

  const sessionPeers = peersBySession.get(sessionId);
  if (sessionPeers) {
    sessionPeers.delete(peerId);
    if (sessionPeers.size === 0) {
      peersBySession.delete(sessionId);
    }
  }

  const userPeers = peersByUser.get(userId);
  if (userPeers) {
    userPeers.delete(peerId);
    if (userPeers.size === 0) {
      peersByUser.delete(userId);
    }
  }
}

/** 踢掉指定 Session 的所有 WebSocket 连接。 */
export function kickSession(sessionId: string): void {
  const peerIds = peersBySession.get(sessionId);
  if (!peerIds || peerIds.size === 0) return;

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

/** 踢掉指定用户的所有 WebSocket 连接。 */
export function kickAllSessionsForUser(userId: string): void {
  const peerIds = peersByUser.get(userId);
  if (!peerIds || peerIds.size === 0) return;

  const ids = [...peerIds];
  for (const peerId of ids) {
    const ref = peerRefs.get(peerId);
    if (ref) {
      try {
        ref.peer.close(WS_CLOSE_ALL_SESSIONS_REVOKED, "all_sessions_revoked");
      } catch {
        // peer 可能已关闭，忽略
      }
    }
  }
}

/** 获取用户的在线连接数。 */
export function getUserConnectionCount(userId: string): number {
  return peersByUser.get(userId)?.size ?? 0;
}

/** 获取 Session 的连接数。 */
export function getSessionConnectionCount(sessionId: string): number {
  return peersBySession.get(sessionId)?.size ?? 0;
}
