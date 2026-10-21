/** Iran (Jalali) calendar month helpers for reception revenue windows. */

import { IRAN_TIME_ZONE } from './iran-date.js';

export type IranYearMonth = {
  year: number;
  month: number;
};

const ymFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  timeZone: IRAN_TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
});

const monthLabelFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: IRAN_TIME_ZONE,
  year: 'numeric',
  month: 'long',
});

/** Persian calendar year + month (1–12) for an instant in Iran. */
export function iranYearMonth(date: Date = new Date()): IranYearMonth {
  const parts = ymFormatter.formatToParts(date);
  const yearRaw = parts.find((p) => p.type === 'year')?.value ?? '0';
  const monthRaw = parts.find((p) => p.type === 'month')?.value ?? '0';
  // Some engines emit Arabic-Indic digits; normalize to ASCII.
  const toAscii = (s: string) =>
    s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(
      /[٠-٩]/g,
      (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)),
    );
  return {
    year: Number(toAscii(yearRaw)),
    month: Number(toAscii(monthRaw)),
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
