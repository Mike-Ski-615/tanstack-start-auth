const DAY_MS = 86_400_000;

export function daysSince(iso: string) {
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS),
  );
}
