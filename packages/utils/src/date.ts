/** Date helpers (pure functions) */

/** Return an ISO-8601 string without milliseconds. */
export function formatISO(date: Date = new Date()): string {
  const d = new Date(date.getTime());
  d.setMilliseconds(0);
  return d.toISOString();
}

/** Convert a Date (or now) to a Unix timestamp in seconds. */
export function toUnix(date: Date = new Date()): number {
  return Math.floor(date.getTime() / 1000);
}

/** Convert a Unix timestamp in seconds to a Date. */
export function fromUnix(seconds: number): Date {
  return new Date(seconds * 1000);
}

/** Whether two dates fall on the same UTC day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
