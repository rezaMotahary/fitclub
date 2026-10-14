import { describe, expect, it } from 'vitest';
import { dayStringToUtcNoon } from '../common/iran-date.js';
import {
  assertMinimumPayment,
  assertStartTodayOrTomorrow,
  earlyRenewalStartDay,
  periodFromStartDay,
  SubscriptionRuleError,
} from '../common/subscription-period.js';

/**
 * Pure rule coverage for sell/renew (service DB paths covered in e2e).
 */
describe('subscription sell/renew rules', () => {
  it('new sale start must be today or tomorrow', () => {
    const today = '2026-10-14';
    expect(() => assertStartTodayOrTomorrow(today, today)).not.toThrow();
    expect(() =>
      assertStartTodayOrTomorrow('2026-10-13', today),
    ).toThrow(SubscriptionRuleError);
  });

  it('period is exactly 30 calendar days', () => {
    const p = periodFromStartDay('2026-10-14');
    expect(p.endsOn).toBe('2026-11-12');
  });

  it('early renew has no gap after current end', () => {
    expect(earlyRenewalStartDay('2026-11-12')).toBe('2026-11-13');
  });

  it('rejects below-half payment for sale/renew', () => {
    expect(() => assertMinimumPayment(1_190_000, 500_000)).toThrow(
      SubscriptionRuleError,
    );
    expect(() => assertMinimumPayment(1_190_000, 595_000)).not.toThrow();
  });

  it('stores period boundaries as UTC noon calendar days', () => {
    const starts = dayStringToUtcNoon('2026-10-14');
    const ends = dayStringToUtcNoon('2026-11-12');
    expect(starts.toISOString()).toContain('2026-10-14');
    expect(ends.toISOString()).toContain('2026-11-12');
  });
});
