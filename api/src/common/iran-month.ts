/** Iran (Jalali) calendar month helpers for reception revenue windows. */

import {
  addIranDays,
  inclusiveDaySpan,
  IRAN_TIME_ZONE,
  isValidDayString,
} from './iran-date.js';
import { toAsciiDigits } from './iran-mobile.js';

export type IranYearMonth = {
  year: number;
  month: number;
};

export type JalaliYmd = IranYearMonth & { day: number };

const ymFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  timeZone: IRAN_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
});

const ymdFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  timeZone: IRAN_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

const monthLabelFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: IRAN_TIME_ZONE,
  year: 'numeric',
  month: 'long',
});

const dayLabelFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: IRAN_TIME_ZONE,
  month: 'short',
  day: 'numeric',
});

function asciiDigits(raw: string): string {
  return toAsciiDigits(raw);
}

function partNumber(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const raw = parts.find((p) => p.type === type)?.value ?? '0';
  return Number(asciiDigits(raw));
}

function instantAtIranNoon(day: string): Date {
  return new Date(`${day}T12:00:00+03:30`);
}

function jalaliPartsOfInstant(date: Date): JalaliYmd {
  const parts = ymdFormatter.formatToParts(date);
  return {
    year: partNumber(parts, 'year'),
    month: partNumber(parts, 'month'),
    day: partNumber(parts, 'day'),
  };
}

function compareJalali(a: JalaliYmd, b: JalaliYmd): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** Persian calendar year + month (1–12) for an instant in Iran. */
export function iranYearMonth(date: Date = new Date()): IranYearMonth {
  const parts = ymFormatter.formatToParts(date);
  return {
    year: partNumber(parts, 'year'),
    month: partNumber(parts, 'month'),
  };
}

export function isSameIranMonth(a: Date, b: Date = new Date()): boolean {
  const A = iranYearMonth(a);
  const B = iranYearMonth(b);
  return A.year === B.year && A.month === B.month;
}

/** e.g. «مهر ۱۴۰۴» */
export function iranMonthLabel(date: Date = new Date()): string {
  return monthLabelFormatter.format(date);
}

export function iranMonthLabelFromYm(year: number, month: number): string {
  const { fromDay } = iranMonthDayBounds(year, month);
  return iranMonthLabel(instantAtIranNoon(fromDay));
}

/** Short Jalali label for a Gregorian Iran day string, e.g. «۱ مهر». */
export function iranDayLabelFa(day: string): string {
  return dayLabelFormatter.format(instantAtIranNoon(day));
}

export function jalaliPartsOfIranDay(day: string): JalaliYmd {
  return jalaliPartsOfInstant(instantAtIranNoon(day));
}

/**
 * Convert a Jalali Y-M-D to the Gregorian Iran day string used everywhere else.
 */
export function jalaliToIranDayString(
  year: number,
  month: number,
  day: number,
): string {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error('Invalid Jalali date');
  }

  const target: JalaliYmd = { year, month, day };
  let lo = `${year + 621}-01-01`;
  let hi = `${year + 622}-12-31`;
  if (!isValidDayString(lo) || !isValidDayString(hi)) {
    throw new Error('Invalid Jalali date');
  }

  while (lo <= hi) {
    const span = inclusiveDaySpan(lo, hi);
    const mid = addIranDays(lo, Math.floor((span - 1) / 2));
    const found = jalaliPartsOfIranDay(mid);
    const cmp = compareJalali(found, target);
    if (cmp === 0) return mid;
    if (cmp < 0) lo = addIranDays(mid, 1);
    else hi = addIranDays(mid, -1);
  }

  throw new Error('Invalid Jalali date');
}

/** Inclusive Gregorian Iran-day bounds of a Jalali month. */
export function iranMonthDayBounds(
  year: number,
  month: number,
): { fromDay: string; toDay: string } {
  const fromDay = jalaliToIranDayString(year, month, 1);
  let toDay = fromDay;
  for (;;) {
    const next = addIranDays(toDay, 1);
    const parts = jalaliPartsOfIranDay(next);
    if (parts.year !== year || parts.month !== month) break;
    toDay = next;
  }
  return { fromDay, toDay };
}

/**
 * Oldest → newest, length `count`, last item is the month containing `now`.
 */
export function lastNIranMonths(now: Date, count: number): IranYearMonth[] {
  const n = Math.max(0, Math.floor(count));
  const current = iranYearMonth(now);
  const newestFirst: IranYearMonth[] = [];
  let year = current.year;
  let month = current.month;
  for (let i = 0; i < n; i++) {
    newestFirst.push({ year, month });
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return newestFirst.reverse();
}

/**
 * Accept Gregorian `YYYY-MM-DD` or Jalali `1404/07/01` (Persian or English digits).
 * Returns the Gregorian Iran day string, or null if unusable.
 */
export function parseFlexibleIranDay(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const ascii = asciiDigits(raw.trim());
  const match = /^(\d{3,4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(ascii);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  if (year >= 1700) {
    const padded = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return isValidDayString(padded) ? padded : null;
  }

  if (year < 1200 || year > 1600 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  try {
    const converted = jalaliToIranDayString(year, month, day);
    const parts = jalaliPartsOfIranDay(converted);
    if (parts.year !== year || parts.month !== month || parts.day !== day) {
      return null;
    }
    return converted;
  } catch {
    return null;
  }
}
