import { describe, expect, it } from 'vitest';
import {
  addIranDays,
  compareIranDays,
  inclusiveDaySpan,
  isValidDayString,
  subscriptionDayNumber,
  tomorrowIran,
} from './iran-date.js';

describe('iran-date', () => {
  it('adds calendar days across month boundaries', () => {
    expect(addIranDays('2026-03-20', 1)).toBe('2026-03-21');
    expect(addIranDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addIranDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('computes inclusive span and subscription day numbers', () => {
    expect(inclusiveDaySpan('2026-03-01', '2026-03-01')).toBe(1);
    expect(inclusiveDaySpan('2026-03-01', '2026-03-30')).toBe(30);
    expect(subscriptionDayNumber('2026-03-01', '2026-03-30', '2026-03-01')).toBe(
      1,
    );
    expect(subscriptionDayNumber('2026-03-01', '2026-03-30', '2026-03-10')).toBe(
      10,
    );
    expect(subscriptionDayNumber('2026-03-01', '2026-03-30', '2026-03-30')).toBe(
      30,
    );
    expect(
      subscriptionDayNumber('2026-03-01', '2026-03-30', '2026-02-28'),
    ).toBeNull();
    expect(
      subscriptionDayNumber('2026-03-01', '2026-03-30', '2026-03-31'),
    ).toBeNull();
  });

  it('compares and validates day strings', () => {
    expect(compareIranDays('2026-03-01', '2026-03-02')).toBe(-1);
    expect(isValidDayString('2026-02-29')).toBe(false);
    expect(isValidDayString('2026-02-28')).toBe(true);
    expect(tomorrowIran('2026-10-14')).toBe('2026-10-15');
  });
});
