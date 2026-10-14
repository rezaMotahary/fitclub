import { describe, expect, it } from 'vitest';
import { dayStringToUtcNoon } from './iran-date.js';
import {
  assertMinimumPayment,
  assertStartTodayOrTomorrow,
  classifySubscription,
  computeRenewalPricing,
  debtBlocksEntryForSubscription,
  earlyRenewalStartDay,
  periodFromStartDay,
  SubscriptionRuleError,
} from './subscription-period.js';

describe('subscription-period', () => {
  it('builds a 30-day window', () => {
    expect(periodFromStartDay('2026-03-01')).toEqual({
      startsOn: '2026-03-01',
      endsOn: '2026-03-30',
    });
  });

  it('allows only today or tomorrow for new starts', () => {
    expect(() =>
      assertStartTodayOrTomorrow('2026-10-14', '2026-10-14'),
    ).not.toThrow();
    expect(() =>
      assertStartTodayOrTomorrow('2026-10-15', '2026-10-14'),
    ).not.toThrow();
    expect(() =>
      assertStartTodayOrTomorrow('2026-10-13', '2026-10-14'),
    ).toThrow(SubscriptionRuleError);
    expect(() =>
      assertStartTodayOrTomorrow('2026-10-16', '2026-10-14'),
    ).toThrow(SubscriptionRuleError);
  });

  it('early renewal always starts the day after current end (no gap)', () => {
    expect(earlyRenewalStartDay('2026-03-30')).toBe('2026-03-31');
  });

  it('applies admin early-renewal discount only before period ends', () => {
    expect(
      computeRenewalPricing({
        planPriceToman: 1_000_000,
        earlyRenewalDiscountPercent: 10,
        renewingBeforeCurrentEnds: true,
      }),
    ).toEqual({ priceToman: 900_000, discountPercentApplied: 10 });

    expect(
      computeRenewalPricing({
        planPriceToman: 1_000_000,
        earlyRenewalDiscountPercent: 10,
        renewingBeforeCurrentEnds: false,
      }),
    ).toEqual({ priceToman: 1_000_000, discountPercentApplied: 0 });
  });

  it('rejects payments below half tuition', () => {
    expect(() => assertMinimumPayment(890_000, 444_999)).toThrow(
      SubscriptionRuleError,
    );
    expect(() => assertMinimumPayment(890_000, 445_000)).not.toThrow();
  });

  it('classifies current / upcoming / expired and debt gate', () => {
    const current = {
      startsAt: dayStringToUtcNoon('2026-10-01'),
      endsAt: dayStringToUtcNoon('2026-10-30'),
      priceToman: 890_000,
      amountPaidToman: 445_000,
    };
    expect(classifySubscription(current, '2026-10-10')).toBe('current');
    expect(classifySubscription(current, '2026-10-31')).toBe('expired');
    expect(
      classifySubscription(
        { ...current, startsAt: dayStringToUtcNoon('2026-11-01') },
        '2026-10-14',
      ),
    ).toBe('upcoming');

    expect(debtBlocksEntryForSubscription(current, '2026-10-10')).toBe(false);
    expect(debtBlocksEntryForSubscription(current, '2026-10-16')).toBe(true);
  });
});
