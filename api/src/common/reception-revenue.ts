/** Reception-only revenue windows (tuition / recorded services). No rent/payroll/buffet. */

import { addIranDays, iranDayString } from './iran-date.js';
import {
  iranDayLabelFa,
  iranMonthDayBounds,
  iranMonthLabel,
  iranMonthLabelFromYm,
  iranYearMonth,
  lastNIranMonths,
} from './iran-month.js';

export type RevenuePayment = {
  amountToman: number;
  paidAt: Date;
};

export type RevenueBucket = {
  amountToman: number;
  paymentCount: number;
};

export type DailyRevenuePoint = RevenueBucket & {
  day: string;
  label: string;
};

export type MonthlyRevenuePoint = RevenueBucket & {
  iranYear: number;
  iranMonth: number;
  label: string;
  fromDay: string;
  toDay: string;
};

export type ReceptionRevenueReport = {
  today: RevenueBucket & { day: string; jalaliLabel: string };
  thisMonth: RevenueBucket & {
    iranYear: number;
    iranMonth: number;
    monthLabel: string;
    fromDay: string;
    toDay: string;
  };
  range: RevenueBucket & {
    fromDay: string;
    toDay: string;
    jalaliFromLabel: string;
    jalaliToLabel: string;
  };
  daily: DailyRevenuePoint[];
  monthly: MonthlyRevenuePoint[];
};

function sumPayments(list: RevenuePayment[]): RevenueBucket {
  return {
    amountToman: list.reduce((sum, p) => sum + p.amountToman, 0),
    paymentCount: list.length,
  };
}

function iranDayOf(paidAt: Date): string {
  return iranDayString(paidAt);
}

function inInclusiveDayRange(paidAt: Date, fromDay: string, toDay: string): boolean {
  const day = iranDayOf(paidAt);
  return day >= fromDay && day <= toDay;
}

export function buildReceptionRevenue(params: {
  payments: RevenuePayment[];
  now: Date;
  rangeFromDay: string;
  rangeToDay: string;
  monthlyLookback?: number;
}): ReceptionRevenueReport {
  const { payments, now, rangeFromDay, rangeToDay } = params;
  const monthlyLookback = params.monthlyLookback ?? 6;
  const today = iranDayString(now);
  const ym = iranYearMonth(now);
  const monthBounds = iranMonthDayBounds(ym.year, ym.month);

  const todayList = payments.filter((p) => iranDayOf(p.paidAt) === today);
  const monthList = payments.filter((p) =>
    inInclusiveDayRange(p.paidAt, monthBounds.fromDay, monthBounds.toDay),
  );
  const rangeList = payments.filter((p) =>
    inInclusiveDayRange(p.paidAt, rangeFromDay, rangeToDay),
  );

  const daily: DailyRevenuePoint[] = [];
  for (let day = rangeFromDay; day <= rangeToDay; day = addIranDays(day, 1)) {
    const list = payments.filter((p) => iranDayOf(p.paidAt) === day);
    daily.push({
      day,
      label: iranDayLabelFa(day),
      ...sumPayments(list),
    });
  }

  const monthly: MonthlyRevenuePoint[] = lastNIranMonths(now, monthlyLookback).map(
    (item) => {
      const bounds = iranMonthDayBounds(item.year, item.month);
      const list = payments.filter((p) =>
        inInclusiveDayRange(p.paidAt, bounds.fromDay, bounds.toDay),
      );
      return {
        iranYear: item.year,
        iranMonth: item.month,
        label: iranMonthLabelFromYm(item.year, item.month),
        fromDay: bounds.fromDay,
        toDay: bounds.toDay,
        ...sumPayments(list),
      };
    },
  );

  return {
    today: {
      ...sumPayments(todayList),
      day: today,
      jalaliLabel: iranDayLabelFa(today),
    },
    thisMonth: {
      ...sumPayments(monthList),
      iranYear: ym.year,
      iranMonth: ym.month,
      monthLabel: iranMonthLabel(now),
      fromDay: monthBounds.fromDay,
      toDay: monthBounds.toDay,
    },
    range: {
      ...sumPayments(rangeList),
      fromDay: rangeFromDay,
      toDay: rangeToDay,
      jalaliFromLabel: iranDayLabelFa(rangeFromDay),
      jalaliToLabel: iranDayLabelFa(rangeToDay),
    },
    daily,
    monthly,
  };
}
