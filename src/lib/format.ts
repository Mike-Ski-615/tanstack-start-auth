const DAY_MS = 86_400_000;

export function daysSince(iso: string) {
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS),
  );
}

/**
 * 在线状态行。
 * 由于 connectedAt / disconnectedAt 已移除，仅显示在线/离线状态。
 */
export function formatPresence(user: { status: "online" | "offline" }) {
  return user.status === "online" ? "在线" : "离线";
}
