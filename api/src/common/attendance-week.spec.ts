import { describe, expect, it } from 'vitest';
import {
  countedDaysFromAttendances,
  weekContaining,
  weeklyCapBlocksEntry,
  weeklyRemaining,
} from './attendance-week.js';

describe('attendance-week', () => {
  it('week is Saturday–Friday containing the day', () => {
    // 2026-10-15 Thursday → Sat 2026-10-10 … Fri 2026-10-16
    expect(weekContaining('2026-10-15')).toEqual({
      startDay: '2026-10-10',
      endDay: '2026-10-16',
    });
    expect(weekContaining('2026-10-10')).toEqual({
      startDay: '2026-10-10',
      endDay: '2026-10-16',
    });
    expect(weekContaining('2026-10-16')).toEqual({
      startDay: '2026-10-10',
      endDay: '2026-10-16',
    });
  });

  it('counts distinct closed non-voided SUCCESS days only', () => {
    const week = weekContaining('2026-10-15');
    const days = countedDaysFromAttendances(
      [
        {
          checkInAt: new Date('2026-10-11T08:00:00+03:30'),
          checkOutAt: new Date('2026-10-11T09:00:00+03:30'),
          result: 'SUCCESS',
          voidedAt: null,
        },
        {
          // same day again — still one day
          checkInAt: new Date('2026-10-11T10:00:00+03:30'),
          checkOutAt: new Date('2026-10-11T11:00:00+03:30'),
          result: 'SUCCESS',
          voidedAt: null,
        },
        {
          checkInAt: new Date('2026-10-12T08:00:00+03:30'),
          checkOutAt: new Date('2026-10-12T09:00:00+03:30'),
          result: 'SUCCESS',
          voidedAt: new Date('2026-10-12T12:00:00+03:30'),
        },
        {
          checkInAt: new Date('2026-10-13T08:00:00+03:30'),
          checkOutAt: null,
          result: 'SUCCESS',
          voidedAt: null,
        },
        {
          checkInAt: new Date('2026-10-14T08:00:00+03:30'),
          checkOutAt: new Date('2026-10-14T09:00:00+03:30'),
          result: 'REJECTED_DEBT',
          voidedAt: null,
        },
      ],
      week,
    );
    expect(days).toEqual(['2026-10-11']);
    expect(weeklyRemaining(3, days)).toBe(2);
  });

  it('cap blocks only when today not yet counted', () => {
    expect(
      weeklyCapBlocksEntry({
        weeklyCap: 2,
        countedDays: ['2026-10-11', '2026-10-12'],
        today: '2026-10-13',
      }),
    ).toBe(true);
    expect(
      weeklyCapBlocksEntry({
        weeklyCap: 2,
        countedDays: ['2026-10-11', '2026-10-12'],
        today: '2026-10-12',
      }),
    ).toBe(false);
  });
});
