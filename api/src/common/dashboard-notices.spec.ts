import { describe, expect, it } from 'vitest';
import {
  buildMemberNotices,
  shouldShowExpiryNotice,
  weekCalendarDays,
} from './dashboard-notices.js';

describe('shouldShowExpiryNotice', () => {
  it('shows from 14 days remaining through last day', () => {
    expect(
      shouldShowExpiryNotice({ remainingDays: 14, hasUpcomingRenewal: false }),
    ).toBe(true);
    expect(
      shouldShowExpiryNotice({ remainingDays: 1, hasUpcomingRenewal: false }),
    ).toBe(true);
  });

  it('hides when more than 14 days left, expired, or renewal queued', () => {
    expect(
      shouldShowExpiryNotice({ remainingDays: 15, hasUpcomingRenewal: false }),
    ).toBe(false);
    expect(
      shouldShowExpiryNotice({ remainingDays: 0, hasUpcomingRenewal: false }),
    ).toBe(false);
    expect(
      shouldShowExpiryNotice({ remainingDays: null, hasUpcomingRenewal: false }),
    ).toBe(false);
    expect(
      shouldShowExpiryNotice({ remainingDays: 7, hasUpcomingRenewal: true }),
    ).toBe(false);
  });
});

describe('buildMemberNotices', () => {
  it('returns no-subscription notice when no current period', () => {
    const notices = buildMemberNotices({
      hasCurrentSubscription: false,
      remainingDays: null,
      hasUpcomingRenewal: false,
      debtToman: 0,
      debtBlocksEntry: false,
      weeklyCap: 3,
      remainingWeekDays: 3,
      todayAlreadyCounted: false,
    });
    expect(notices).toHaveLength(1);
    expect(notices[0]?.type).toBe('no_subscription');
  });

  it('includes expiry wording without auto-renew', () => {
    const notices = buildMemberNotices({
      hasCurrentSubscription: true,
      remainingDays: 10,
      hasUpcomingRenewal: false,
      debtToman: 0,
      debtBlocksEntry: false,
      weeklyCap: 3,
      remainingWeekDays: 2,
      todayAlreadyCounted: false,
    });
    expect(notices.some((n) => n.type === 'expiry')).toBe(true);
    expect(notices.find((n) => n.type === 'expiry')?.message).toContain(
      'تمدید خودکار نیست',
    );
  });

  it('flags weekly cap when remaining is zero and today not counted', () => {
    const notices = buildMemberNotices({
      hasCurrentSubscription: true,
      remainingDays: 20,
      hasUpcomingRenewal: false,
      debtToman: 0,
      debtBlocksEntry: false,
      weeklyCap: 2,
      remainingWeekDays: 0,
      todayAlreadyCounted: false,
    });
    expect(notices.some((n) => n.type === 'weekly_cap')).toBe(true);
  });
});

describe('weekCalendarDays', () => {
  it('builds Saturday–Friday with counted and today flags', () => {
    const days = weekCalendarDays({
      startDay: '2026-10-17',
      countedDays: ['2026-10-18', '2026-10-20'],
      today: '2026-10-21',
      addIranDays: (day, delta) => {
        const base = new Date(`${day}T12:00:00Z`);
        base.setUTCDate(base.getUTCDate() + delta);
        const y = base.getUTCFullYear();
        const m = String(base.getUTCMonth() + 1).padStart(2, '0');
        const d = String(base.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      },
    });
    expect(days).toHaveLength(7);
    expect(days[0]?.weekdayLabel).toBe('شنبه');
    expect(days[6]?.weekdayLabel).toBe('جمعه');
    expect(days.find((d) => d.day === '2026-10-18')?.counted).toBe(true);
    expect(days.find((d) => d.day === '2026-10-21')?.isToday).toBe(true);
  });
});
