import { describe, expect, it } from 'vitest';
import {
  durationMinutesFromTimestamps,
  resolveDurationMinutes,
} from './attendance-duration.js';

describe('durationMinutesFromTimestamps', () => {
  it('floors 08:15 → 10:01 to 106 minutes', () => {
    const checkIn = new Date('2026-10-21T08:15:00+03:30');
    const checkOut = new Date('2026-10-21T10:01:00+03:30');
    expect(durationMinutesFromTimestamps(checkIn, checkOut)).toBe(106);
  });

  it('returns null when checkout missing', () => {
    expect(
      durationMinutesFromTimestamps(new Date('2026-10-21T08:15:00+03:30'), null),
    ).toBeNull();
  });

  it('never goes negative', () => {
    const checkIn = new Date('2026-10-21T10:00:00+03:30');
    const checkOut = new Date('2026-10-21T09:00:00+03:30');
    expect(durationMinutesFromTimestamps(checkIn, checkOut)).toBe(0);
  });
});

describe('resolveDurationMinutes', () => {
  it('ignores stored minutes when timestamps disagree (KI-003)', () => {
    const checkIn = new Date('2026-10-21T08:15:00+03:30');
    const checkOut = new Date('2026-10-21T10:01:00+03:30');
    expect(
      resolveDurationMinutes({
        checkInAt: checkIn,
        checkOutAt: checkOut,
        storedMinutes: 1,
      }),
    ).toBe(106);
  });

  it('falls back to stored only when still open', () => {
    expect(
      resolveDurationMinutes({
        checkInAt: new Date('2026-10-21T08:15:00+03:30'),
        checkOutAt: null,
        storedMinutes: 1,
      }),
    ).toBe(1);
  });
});
