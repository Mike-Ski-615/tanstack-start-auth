/**
 * WebSocket 连接追踪 — 内存注册表。
 *
 * 在线状态的唯一真源（User.status 字段已废除 —— 它是第二真源，
 * 注册表丢失时会永久留下错误的 online，见 CONTEXT.md）。
 *
 * 供 server functions 调用 kickSession / kickAllSessionsForUser。
 * WS handler (ws.ts) 在连接建立/关闭时更新此注册表。
 *
 * 多实例部署时需替换为 Redis。
 */

import {
  WS_CLOSE_SESSION_REPLACED,
  WS_CLOSE_ALL_SESSIONS_REVOKED,
  WS_CLOSE_NORMAL,
} from "#lib/ws-close-codes";
import type { ServerMessage } from "#lib/ws-protocol";

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

/** 踢掉指定 Session 的所有 WebSocket 连接（会话被替换）。 */
export function kickSession(sessionId: string): void {
  kickSessionWith(sessionId, WS_CLOSE_SESSION_REPLACED, "session_replaced");
}

/**
 * 登出：用正常关闭码断开该 Session 的连接，不触发客户端的「被踢」提示。
 *
 * 不更新 status —— 留给 close handler 处理（那里才能保证 peer 已从
 * 注册表移除，避免重复写库）。
 */
export function closeSessionPeers(sessionId: string): void {
  kickSessionWith(sessionId, WS_CLOSE_NORMAL, "logout");
}

function kickSessionWith(sessionId: string, code: number, reason: string): void {
  const peerIds = peersBySession.get(sessionId);
  if (!peerIds || peerIds.size === 0) return;

  const ids = [...peerIds];
  for (const peerId of ids) {
    const ref = peerRefs.get(peerId);
    if (ref) {
      try {
        ref.peer.close(code, reason);
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

/**
 * 当前在线用户 id 快照。
 *
 * 返回数组而非 Set：结果要经 JSON 广播，Set 序列化为 {} 会静默丢数据。
 * 排序保证同一状态下输出稳定，便于客户端比对与测试。
 */
export function getOnlineUserIds(): string[] {
  return [...peersByUser.keys()].sort();
}

/**
 * 向所有在线 peer 广播在线状态快照。
 *
 * 单实例下直接遍历内存注册表，不经过 pub/sub —— 同进程内
 * publish 与 send 等价，多一层间接没有收益。等真要多实例时
 * 再换成 Redis pub/sub。
 *
 * 发送失败逐个吞掉：某个 peer 已死不应影响其余 peer 收到广播。
 */
export function broadcastPresence(): void {
  const message: ServerMessage = { type: "presence", userIds: getOnlineUserIds() };
  const data = JSON.stringify(message);

  for (const ref of peerRefs.values()) {
    try {
      ref.peer.send(data);
    } catch {
      // peer 可能已关闭，忽略
    }
  }
}
