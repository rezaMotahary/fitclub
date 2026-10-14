/** Calendar-day helpers in Asia/Tehran (business rules use Iran days). */

export const IRAN_TIME_ZONE = 'Asia/Tehran';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IRAN_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD for the given instant in Iran. */
export function iranDayString(date: Date = new Date()): string {
  return dayFormatter.format(date);
}

export function parseDayString(day: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) {
    throw new Error(`Invalid day string: ${day}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function isValidDayString(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const { year, month, day: d } = parseDayString(day);
  const utc = new Date(Date.UTC(year, month - 1, d));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === d
  );
}

/** Noon UTC on that calendar date — stable for day arithmetic / storage. */
export function dayStringToUtcNoon(day: string): Date {
  const { year, month, day: d } = parseDayString(day);
  return new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
}

export function addIranDays(day: string, deltaDays: number): string {
  const base = dayStringToUtcNoon(day);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  const d = String(base.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function compareIranDays(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** Inclusive day count from startDay to endDay (same day → 1). */
export function inclusiveDaySpan(startDay: string, endDay: string): number {
  const start = dayStringToUtcNoon(startDay).getTime();
  const end = dayStringToUtcNoon(endDay).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

/**
 * Day number within a 30-day subscription (1 = start day).
 * Returns null if outside the period.
 */
export function subscriptionDayNumber(
  startsOn: string,
  endsOn: string,
  today: string,
): number | null {
  if (compareIranDays(today, startsOn) < 0) return null;
  if (compareIranDays(today, endsOn) > 0) return null;
  return inclusiveDaySpan(startsOn, today);
}

export function todayIran(): string {
  return iranDayString(new Date());
}

export function tomorrowIran(today = todayIran()): string {
  return addIranDays(today, 1);
}
