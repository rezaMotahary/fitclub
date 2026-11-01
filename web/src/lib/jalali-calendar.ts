import { toAsciiDigits } from "./auth";
import { dayStringToUtcNoon } from "./jalali-date";

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export const JALALI_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;

const ymdFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function faDigits(n: number, pad = 0): string {
  return String(n)
    .padStart(pad, "0")
    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

function partNumber(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number {
  const raw = parts.find((p) => p.type === type)?.value ?? "0";
  return Number(toAsciiDigits(raw));
}

function jalaliPartsOfUtcNoon(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = ymdFormatter.formatToParts(date);
  return {
    year: partNumber(parts, "year"),
    month: partNumber(parts, "month"),
    day: partNumber(parts, "day"),
  };
}

function addUtcDays(day: string, n: number): string {
  const date = dayStringToUtcNoon(day);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function compareJalali(
  a: { year: number; month: number; day: number },
  b: { year: number; month: number; day: number },
): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/** Gregorian Iran-day string for a Jalali Y-M-D (same convention as API). */
export function jalaliToGregorianDay(
  year: number,
  month: number,
  day: number,
): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const target = { year, month, day };
  let lo = `${year + 621}-01-01`;
  let hi = `${year + 622}-12-31`;
  while (lo <= hi) {
    const loDate = dayStringToUtcNoon(lo);
    const hiDate = dayStringToUtcNoon(hi);
    const midMs = loDate.getTime() + Math.floor((hiDate.getTime() - loDate.getTime()) / 2);
    const midDate = new Date(midMs);
    midDate.setUTCHours(12, 0, 0, 0);
    const mid = midDate.toISOString().slice(0, 10);
    const found = jalaliPartsOfUtcNoon(dayStringToUtcNoon(mid));
    const cmp = compareJalali(found, target);
    if (cmp === 0) return mid;
    if (cmp < 0) lo = addUtcDays(mid, 1);
    else hi = addUtcDays(mid, -1);
  }
  return null;
}

export function jalaliMonthLength(year: number, month: number): number {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  const thirtieth = jalaliToGregorianDay(year, 12, 30);
  if (!thirtieth) return 29;
  const parts = jalaliPartsOfUtcNoon(dayStringToUtcNoon(thirtieth));
  return parts.year === year && parts.month === 12 && parts.day === 30 ? 30 : 29;
}

export function formatJalaliFieldValue(
  year: number,
  month: number,
  day: number,
): string {
  return `${faDigits(year)}/${faDigits(month, 2)}/${faDigits(day, 2)}`;
}

export function jalaliMonthName(month: number): string {
  return JALALI_MONTH_NAMES[month - 1] ?? "";
}

export type JalaliCell = {
  day: number | null;
  value: string;
};

export function jalaliMonthGrid(year: number, month: number): JalaliCell[] {
  const length = jalaliMonthLength(year, month);
  const firstDay = jalaliToGregorianDay(year, month, 1);
  let pad = 0;
  if (firstDay) {
    const weekday = dayStringToUtcNoon(firstDay).getUTCDay();
    pad = (weekday + 1) % 7;
  }
  const cells: JalaliCell[] = [];
  for (let i = 0; i < pad; i++) {
    cells.push({ day: null, value: "" });
  }
  for (let day = 1; day <= length; day++) {
    cells.push({
      day,
      value: formatJalaliFieldValue(year, month, day),
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, value: "" });
  }
  return cells;
}

export function shiftJalaliMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  let y = year;
  let m = month + delta;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}

export function parseJalaliFieldParts(raw: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const ascii = toAsciiDigits(raw.trim());
  const match = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(ascii);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1300 || year > 1500 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return { year, month, day };
}
