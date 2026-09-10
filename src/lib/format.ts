const DAY_MS = 86_400_000;

export function daysSince(iso: string) {
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS),
  );
}

/**
 * 在线状态文案。
 *
 * 入参是 bool 而非 user 对象：在线状态已不存于 User（那会与
 * WS 注册表形成双真源），由调用方从 useOnlineUsers() 推导后传入。
 */
export function formatPresence(isOnline: boolean) {
  return isOnline ? "在线" : "离线";
}
