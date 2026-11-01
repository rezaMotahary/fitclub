import { compareIranDays, inclusiveDaySpan } from '../common/iran-date.js';
import { toAsciiDigits } from '../common/iran-mobile.js';
import {
  iranMonthDayBounds,
  iranYearMonth,
  parseFlexibleIranDay,
} from '../common/iran-month.js';

export type AdminOverviewQueryInput = {
  iranYear?: number | string;
  iranMonth?: number | string;
  from?: string;
  to?: string;
};

export type AdminRevenueRangeOk = {
  ok: true;
  fromDay: string;
  toDay: string;
  source: 'this-month' | 'month' | 'custom';
};

export type AdminRevenueRangeErr = {
  ok: false;
  message: string;
};

export type AdminRevenueRange = AdminRevenueRangeOk | AdminRevenueRangeErr;

const MAX_RANGE_DAYS = 366;

function toOptionalInt(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  const ascii = toAsciiDigits(String(value)).trim();
  if (!ascii) return undefined;
  return Number(ascii);
}

export function resolveAdminRevenueRange(
  query: AdminOverviewQueryInput,
  now: Date = new Date(),
): AdminRevenueRange {
  const fromRaw = query.from?.trim() ?? '';
  const toRaw = query.to?.trim() ?? '';
  const hasFrom = fromRaw.length > 0;
  const hasTo = toRaw.length > 0;

  if (hasFrom !== hasTo) {
    return { ok: false, message: 'بازه باید هم «از» و هم «تا» داشته باشد' };
  }

  if (hasFrom && hasTo) {
    const fromDay = parseFlexibleIranDay(fromRaw);
    const toDay = parseFlexibleIranDay(toRaw);
    if (!fromDay || !toDay) {
      return { ok: false, message: 'تاریخ از یا تا درست نیست' };
    }
    if (compareIranDays(fromDay, toDay) > 0) {
      return { ok: false, message: 'تاریخ «از» نمی‌تواند بعد از «تا» باشد' };
    }
    if (inclusiveDaySpan(fromDay, toDay) > MAX_RANGE_DAYS) {
      return { ok: false, message: 'بازه بیشتر از یک سال مجاز نیست' };
    }
    return { ok: true, fromDay, toDay, source: 'custom' };
  }

  const iranYear = toOptionalInt(query.iranYear);
  const iranMonth = toOptionalInt(query.iranMonth);
  const hasYear = iranYear !== undefined;
  const hasMonth = iranMonth !== undefined;

  if (hasYear !== hasMonth) {
    return { ok: false, message: 'ماه شمسی باید سال و ماه هر دو را داشته باشد' };
  }

  if (hasYear && hasMonth) {
    if (
      !Number.isInteger(iranYear) ||
      !Number.isInteger(iranMonth) ||
      iranYear! < 1300 ||
      iranYear! > 1500 ||
      iranMonth! < 1 ||
      iranMonth! > 12
    ) {
      return { ok: false, message: 'ماه شمسی درست نیست' };
    }
    try {
      const bounds = iranMonthDayBounds(iranYear!, iranMonth!);
      return {
        ok: true,
        fromDay: bounds.fromDay,
        toDay: bounds.toDay,
        source: 'month',
      };
    } catch {
      return { ok: false, message: 'ماه شمسی درست نیست' };
    }
  }

  const current = iranYearMonth(now);
  const bounds = iranMonthDayBounds(current.year, current.month);
  return {
    ok: true,
    fromDay: bounds.fromDay,
    toDay: bounds.toDay,
    source: 'this-month',
  };
}
