/** Iran calendar day (YYYY-MM-DD) — same clock as the API. */

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function iranTodayDay(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

export function addGregorianDays(day: string, deltaDays: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) {
    throw new Error(`Invalid day string: ${day}`);
  }
  const base = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12),
  );
  base.setUTCDate(base.getUTCDate() + deltaDays);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** First sale may start today or tomorrow only. Past dates are rejected. */
export function saleStartChoices(today: string): {
  today: string;
  tomorrow: string;
} {
  return { today, tomorrow: addGregorianDays(today, 1) };
}
