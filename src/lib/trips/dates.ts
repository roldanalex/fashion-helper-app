/** Calendar helpers for trip planning. UTC-only so dates never shift. */

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Every date from start to end inclusive, oldest first, capped at maxDays. */
export function expandDateRange(start: string, end: string, maxDays = 60): string[] {
  let a = start;
  let b = end;
  if (a > b) [a, b] = [b, a];
  const out: string[] = [];
  for (let d = a; d <= b && out.length < maxDays; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "Tue 3 Nov" for a YYYY-MM-DD, independent of the viewer's timezone. */
export function formatTripDate(date: string, withYear = false): string {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}
