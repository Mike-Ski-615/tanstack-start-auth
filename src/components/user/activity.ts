// Real activity feed for the contribution heatmap, spanning the whole current
// calendar year (Jan 1 → Dec 31, date-ascending). `react-activity-calendar`
// fills any inner gaps and lays the range into Sunday-to-Saturday week columns.
// Days after today are still emitted so the full-year grid stays visible, but
// always as empty (count/level 0) "upcoming" cells.
//
// `count` / `level` are currently DETERMINISTIC PLACEHOLDERS — there is no real
// "activity" data source wired up yet. Swap this loader for one that aggregates
// actual user activity (completed tasks, study minutes, …) per day when the
// real store exists.
//
// IMPORTANT for hydration: every date boundary is computed in UTC so the server
// and the browser reach the SAME "today" and the SAME totals at any instant.
// Using local time lets a timezone difference flip the last day between past
// (counted) and future (empty), mismatching SSR vs client markup.
import type { Activity } from "react-activity-calendar";

const DAY = 86_400_000;

/** ISO `yyyy-MM-dd` for a date viewed in UTC. */
function isoUTC(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Current day boundary as UTC ms since epoch (both runtimes share this).
const now = new Date();
const year = now.getUTCFullYear();
const dayStartUTC = Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate(),
);

const startUTC = Date.UTC(year, 0, 1); // Jan 1 midnight UTC
const daysSoFar = Math.round((dayStartUTC - startUTC) / DAY) + 1; // state through today
const totalDays = Math.round((Date.UTC(year, 11, 31) - startUTC) / DAY) + 1;

// Activity grade 0…4 for a given count.
function levelFor(count: number) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

// Deterministic, timezone-stable 0–8 pseudo-count for a UTC day index.
function pseudoCount(unixDay: number) {
  const r = Math.sin(unixDay * 12.9898) * 43758.5453;
  const u = r - Math.floor(r);
  // Heavier tailed toward low activity, like a plausible contribution curve.
  return Math.floor(u * 8.4);
}

// Whole calendar year [Jan 1, Dec 31] as UTC Date instances, ascending. Days
// after today are emitted but always emptied (level 0).
export const activity: Activity[] = Array.from(
  { length: totalDays },
  (_v, i) => {
    const date = new Date(startUTC + i * DAY);
    const unixDay = date.getTime() / DAY;
    const count = i < daysSoFar ? pseudoCount(unixDay) : 0;
    return { date: isoUTC(date), count, level: levelFor(count) };
  },
);
