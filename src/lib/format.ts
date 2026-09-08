const DAY_MS = 86_400_000;

export function daysSince(iso: string) {
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS),
  );
}

function ageMinutes(iso: string): number | undefined {
  return iso
    ? Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
    : undefined;
}

// toMinutes -> 人类可读的相对量（用于拼接文案），不足4周；更久则走日期兜底
function amountMsg(mins: number): string | undefined {
  if (mins < 60) return `${mins}分钟`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天`;
  return undefined;
}

/**
 * 在线状态行。区分两态——
 *   在线：显示在线时长，参考 connectedAt（本次上线起点），now - connectedAt
 *   离线：显示多久前下线，参考 disconnectedAt（本次下线终点），now - disconnectedAt
 */
export function formatPresence(user: {
  status: "online" | "offline";
  connectedAt: string | null;
  disconnectedAt: string | null;
}) {
  if (user.status === "online") {
    const m = ageMinutes(user.connectedAt ?? "");
    if (m === undefined) return "刚刚上线";
    if (m < 1) return "刚刚上线";
    const msg = amountMsg(m);
    return msg
      ? `在线${msg}`
      : `在线 ${new Date(user.connectedAt!).toLocaleDateString()} 起`;
  }

  // 离线
  const m = ageMinutes(user.disconnectedAt ?? "");
  if (m === undefined) return "从未上线";
  if (m < 1) return "刚刚下线";
  const msg = amountMsg(m);
  return msg
    ? `${msg}前下线`
    : `${new Date(user.disconnectedAt!).toLocaleDateString()}下线`;
}
