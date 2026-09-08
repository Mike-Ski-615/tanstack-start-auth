const DAY_MS = 86_400_000;

export function daysSince(iso: string) {
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS),
  );
}

export function formatLastSeen(user: {
  connectedAt: string | null;
  disconnectedAt: string | null;
}) {
  const ts = Math.max(
    user.connectedAt ? new Date(user.connectedAt).getTime() : 0,
    user.disconnectedAt ? new Date(user.disconnectedAt).getTime() : 0,
  );
  if (ts === 0) return "从未在线";

  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return "刚刚上线";
  if (mins < 60) return `${mins}分钟前上线`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前上线`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前上线`;
  return `${new Date(ts).toLocaleDateString()}上线`;
}
