/**
 * Subscription period & renewal start rules — docs/business-rules.md §5.
 */
import {
  addIranDays,
  compareIranDays,
  inclusiveDaySpan,
  iranDayString,
  subscriptionDayNumber,
  tomorrowIran,
} from './iran-date.js';
import {
  applyPercentDiscount,
  isTuitionDebtBlockingEntry,
  minimumHalfTuition,
  tuitionDebt,
} from './subscription-pricing.js';

export const SUBSCRIPTION_DURATION_DAYS = 30;

export type PeriodWindow = {
  startsOn: string;
  endsOn: string;
};

export function periodFromStartDay(startsOn: string): PeriodWindow {
  return {
    startsOn,
    endsOn: addIranDays(startsOn, SUBSCRIPTION_DURATION_DAYS - 1),
  };
}

export function assertStartTodayOrTomorrow(
  startsOn: string,
  today: string,
): void {
  const allowed = new Set([today, tomorrowIran(today)]);
  if (!allowed.has(startsOn)) {
    throw new SubscriptionRuleError(
      'تاریخ شروع فقط امروز یا فردا مجاز است؛ شروع در گذشته ممنوع است',
      'INVALID_START_DATE',
    );
  }
}

/**
 * When renewing before the current period ends, the next period
 * always starts the day after endsOn — no gap, no later start.
 */
export function earlyRenewalStartDay(currentEndsOn: string): string {
  return addIranDays(currentEndsOn, 1);
}

export function isWithinPeriod(
  startsOn: string,
  endsOn: string,
  day: string,
): boolean {
  return (
    compareIranDays(day, startsOn) >= 0 && compareIranDays(day, endsOn) <= 0
  );
}

export function isUpcomingPeriod(startsOn: string, today: string): boolean {
  return compareIranDays(startsOn, today) > 0;
}

export function isExpiredPeriod(endsOn: string, today: string): boolean {
  return compareIranDays(today, endsOn) > 0;
}

export type SubscriptionWindow = {
  startsAt: Date;
  endsAt: Date;
};

export type SubscriptionLike = SubscriptionWindow & {
  priceToman: number;
  amountPaidToman: number;
};

export function calendarDayOf(date: Date): string {
  // Stored as UTC noon for calendar days — format via UTC parts when noon,
  // otherwise Iran local day for legacy local-midnight seed rows.
  if (
    date.getUTCHours() === 12 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0
  ) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return iranDayString(date);
}

export function classifySubscription(
  sub: SubscriptionWindow,
  today: string,
): 'current' | 'upcoming' | 'expired' {
  const startsOn = calendarDayOf(sub.startsAt);
  const endsOn = calendarDayOf(sub.endsAt);
  if (isWithinPeriod(startsOn, endsOn, today)) return 'current';
  if (isUpcomingPeriod(startsOn, today)) return 'upcoming';
  return 'expired';
}

export function computeRenewalPricing(params: {
  planPriceToman: number;
  earlyRenewalDiscountPercent: number;
  renewingBeforeCurrentEnds: boolean;
}): { priceToman: number; discountPercentApplied: number } {
  const { planPriceToman, earlyRenewalDiscountPercent, renewingBeforeCurrentEnds } =
    params;
  if (!renewingBeforeCurrentEnds || earlyRenewalDiscountPercent <= 0) {
    return { priceToman: planPriceToman, discountPercentApplied: 0 };
  }
  return {
    priceToman: applyPercentDiscount(
      planPriceToman,
      earlyRenewalDiscountPercent,
    ),
    discountPercentApplied: earlyRenewalDiscountPercent,
  };
}

export function assertMinimumPayment(
  priceToman: number,
  amountPaidToman: number,
): void {
  const min = minimumHalfTuition(priceToman);
  if (amountPaidToman < min) {
    throw new SubscriptionRuleError(
      `پرداخت کمتر از نصف شهریه مجاز نیست (حداقل ${min.toLocaleString('fa-IR')} تومان)`,
      'BELOW_HALF_TUITION',
    );
  }
}

export function debtBlocksEntryForSubscription(
  sub: SubscriptionLike,
  today: string,
): boolean {
  const startsOn = calendarDayOf(sub.startsAt);
  const endsOn = calendarDayOf(sub.endsAt);
  const dayNumber = subscriptionDayNumber(startsOn, endsOn, today);
  if (dayNumber == null) return true;
  return isTuitionDebtBlockingEntry({
    dayNumber,
    priceToman: sub.priceToman,
    amountPaidToman: sub.amountPaidToman,
  });
}

export function remainingDaysInclusive(
  endsOn: string,
  today: string,
): number {
  if (compareIranDays(today, endsOn) > 0) return 0;
  return inclusiveDaySpan(today, endsOn);
}

export { tuitionDebt, minimumHalfTuition };

export class SubscriptionRuleError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'SubscriptionRuleError';
    this.code = code;
  }
}
