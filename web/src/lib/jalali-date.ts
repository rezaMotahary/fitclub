/**
 * Shared Jalali (Persian) date display for FitClub UI.
 * API may store Gregorian day strings / ISO timestamps; users always see شمسی.
 */

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Noon UTC on YYYY-MM-DD — same stable anchor as api `dayStringToUtcNoon`. */
export function dayStringToUtcNoon(day: string): Date {
  const match = DAY_RE.exec(day);
  if (!match) {
    throw new Error(`Invalid day string: ${day}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const d = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, d, 12, 0, 0));
}

export function isDayString(value: string): boolean {
  return DAY_RE.test(value);
}

const longDayFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const shortDayFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const instantDayFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  timeZone: "Asia/Tehran",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export type JalaliDayStyle = "long" | "short";

/**
 * Format an API calendar day (`YYYY-MM-DD`, Gregorian components for an Iran day)
 * as a Jalali label for the UI.
 */
export function formatJalaliDay(
  day: string | null | undefined,
  style: JalaliDayStyle = "long",
): string {
  if (day == null || day === "") return "";
  if (!isDayString(day)) return day;
  try {
    const date = dayStringToUtcNoon(day);
    return style === "short"
      ? shortDayFormatter.format(date)
      : longDayFormatter.format(date);
  } catch {
    return day;
  }
}

/** Jalali calendar date for an ISO instant (Tehran wall clock). */
export function formatJalaliInstantDay(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "";
  try {
    return instantDayFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Jalali date + clock for an ISO instant (when UI needs both). */
export function formatJalaliDateTime(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "";
  try {
    return dateTimeFormatter.format(new Date(iso));
  } catch {
    return iso;
  }
}
