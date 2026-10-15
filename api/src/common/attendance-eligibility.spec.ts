import { AttendanceResult } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { evaluateEntryEligibility } from './attendance-eligibility.js';
import { weekContaining } from './attendance-week.js';
import { dayStringToUtcNoon } from './iran-date.js';
import { parseSessionSchedule } from './session-schedule.js';

const schedule = parseSessionSchedule({
  men: {
    sat: { open: '15:00', close: '23:00' },
    sun: { open: '15:00', close: '23:00' },
    mon: { open: '15:00', close: '23:00' },
    tue: { open: '15:00', close: '23:00' },
    wed: { open: '15:00', close: '23:00' },
    thu: { open: '15:00', close: '22:00' },
    fri: { open: '16:00', close: '21:00' },
  },
  women: {
    sat: { open: '07:00', close: '14:30' },
    sun: { open: '07:00', close: '14:30' },
    mon: { open: '07:00', close: '14:30' },
    tue: { open: '07:00', close: '14:30' },
    wed: { open: '07:00', close: '14:30' },
    thu: { open: '07:00', close: '13:30' },
    fri: { open: null, close: null },
  },
});

function base(overrides: Record<string, unknown> = {}) {
  const today = '2026-10-14'; // Wednesday
  const startsAt = dayStringToUtcNoon('2026-10-01');
  const endsAt = dayStringToUtcNoon('2026-10-30');
  return {
    today,
    hmNow: '10:00',
    now: new Date('2026-10-14T10:00:00+03:30'),
    isArchived: false,
    sessionGender: 'WOMEN' as const,
    schedule,
    week: weekContaining(today),
    weeklyCap: 3,
    countedDays: [] as string[],
    hasOpenAttendance: false,
    subscription: {
      startsAt,
      endsAt,
      priceToman: 1_190_000,
      amountPaidToman: 1_190_000,
    },
    ...overrides,
  };
}

describe('evaluateEntryEligibility', () => {
  it('allows entry when all rules pass', () => {
    const r = evaluateEntryEligibility(base());
    expect(r.allowed).toBe(true);
    expect(r.remainingWeekDays).toBe(3);
  });

  it('denies archived members', () => {
    const r = evaluateEntryEligibility(base({ isArchived: true }));
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.denyCode).toBe('ARCHIVED');
      expect(r.attendanceResult).toBe(AttendanceResult.REJECTED_ARCHIVED);
    }
  });

  it('denies when period not started yet', () => {
    const r = evaluateEntryEligibility(
      base({
        subscription: null,
        upcomingStartsOn: '2026-10-20',
      }),
    );
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.denyCode).toBe('NOT_STARTED');
  });

  it('denies expired after day 30 session close', () => {
    const endsAt = dayStringToUtcNoon('2026-10-14');
    const r = evaluateEntryEligibility(
      base({
        subscription: {
          startsAt: dayStringToUtcNoon('2026-09-15'),
          endsAt,
          priceToman: 1_000_000,
          amountPaidToman: 1_000_000,
        },
        hmNow: '14:30',
        now: new Date('2026-10-14T14:30:00+03:30'),
      }),
    );
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.denyCode).toBe('EXPIRED');
  });

  it('allows day 30 before session close', () => {
    const endsAt = dayStringToUtcNoon('2026-10-14');
    const r = evaluateEntryEligibility(
      base({
        subscription: {
          startsAt: dayStringToUtcNoon('2026-09-15'),
          endsAt,
          priceToman: 1_000_000,
          amountPaidToman: 1_000_000,
        },
        hmNow: '14:00',
        now: new Date('2026-10-14T14:00:00+03:30'),
      }),
    );
    expect(r.allowed).toBe(true);
  });

  it('debt: day 10 half-paid still open; day 16 blocked', () => {
    const sub = {
      startsAt: dayStringToUtcNoon('2026-10-05'),
      endsAt: dayStringToUtcNoon('2026-11-03'),
      priceToman: 1_000_000,
      amountPaidToman: 500_000,
    };
    const open = evaluateEntryEligibility(
      base({
        today: '2026-10-14', // day 10
        subscription: sub,
        week: weekContaining('2026-10-14'),
      }),
    );
    expect(open.allowed).toBe(true);

    const blocked = evaluateEntryEligibility(
      base({
        today: '2026-10-20', // day 16
        hmNow: '10:00',
        now: new Date('2026-10-20T10:00:00+03:30'),
        subscription: sub,
        week: weekContaining('2026-10-20'),
      }),
    );
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.denyCode).toBe('DEBT');
      expect(blocked.attendanceResult).toBe(AttendanceResult.REJECTED_DEBT);
    }
  });

  it('denies when already inside', () => {
    const r = evaluateEntryEligibility(base({ hasOpenAttendance: true }));
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.denyCode).toBe('ALREADY_INSIDE');
  });

  it('weekly cap: blocks new day; same day revisit ok', () => {
    const blocked = evaluateEntryEligibility(
      base({
        weeklyCap: 2,
        countedDays: ['2026-10-11', '2026-10-12'],
        today: '2026-10-14',
        week: weekContaining('2026-10-14'),
      }),
    );
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) expect(blocked.denyCode).toBe('WEEKLY_CAP');

    const revisit = evaluateEntryEligibility(
      base({
        weeklyCap: 2,
        countedDays: ['2026-10-11', '2026-10-14'],
        today: '2026-10-14',
        week: weekContaining('2026-10-14'),
      }),
    );
    expect(revisit.allowed).toBe(true);
  });

  it('outside own gender session (women during men hours)', () => {
    const r = evaluateEntryEligibility(
      base({
        hmNow: '16:00',
        now: new Date('2026-10-14T16:00:00+03:30'),
        sessionGender: 'WOMEN',
      }),
    );
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.denyCode).toBe('OUTSIDE_SESSION');
      expect(r.attendanceResult).toBe(
        AttendanceResult.REJECTED_OUTSIDE_SESSION,
      );
    }
  });
});
