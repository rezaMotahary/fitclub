import { describe, expect, it } from 'vitest';
import { addIranDays } from './iran-date.js';
import {
  iranMonthDayBounds,
  iranMonthLabel,
  iranYearMonth,
  isSameIranMonth,
  jalaliPartsOfIranDay,
  jalaliToIranDayString,
  lastNIranMonths,
  parseFlexibleIranDay,
} from './iran-month.js';

describe('iranYearMonth / isSameIranMonth', () => {
  it('returns consistent year-month for nearby instants in same month', () => {
    const a = new Date('2026-10-05T12:00:00+03:30');
    const b = new Date('2026-10-20T18:00:00+03:30');
    expect(iranYearMonth(a).year).toBeGreaterThan(1300);
    expect(iranYearMonth(a).month).toBeGreaterThanOrEqual(1);
    expect(iranYearMonth(a).month).toBeLessThanOrEqual(12);
    expect(isSameIranMonth(a, b)).toBe(true);
  });

  it('iranMonthLabel is Persian text', () => {
    const label = iranMonthLabel(new Date('2026-10-15T12:00:00+03:30'));
    expect(label.length).toBeGreaterThan(3);
    expect(/[۰-۹0-9]/.test(label)).toBe(true);
  });
});

describe('jalali ↔ Iran day string', () => {
  it('converts Nowruz 1404 to 2025-03-21', () => {
    expect(jalaliToIranDayString(1404, 1, 1)).toBe('2025-03-21');
    expect(jalaliPartsOfIranDay('2025-03-21')).toEqual({
      year: 1404,
      month: 1,
      day: 1,
    });
  });

  it('converts Mehr 1 1404 to 2025-09-23', () => {
    expect(jalaliToIranDayString(1404, 7, 1)).toBe('2025-09-23');
  });

  it('returns inclusive bounds for Mehr 1404 (30 days)', () => {
    const bounds = iranMonthDayBounds(1404, 7);
    expect(bounds.fromDay).toBe('2025-09-23');
    expect(bounds.toDay).toBe('2025-10-22');
    expect(jalaliPartsOfIranDay(addIranDays(bounds.toDay, 1))).toMatchObject({
      year: 1404,
      month: 8,
      day: 1,
    });
  });
});

describe('parseFlexibleIranDay', () => {
  it('accepts Gregorian Iran day strings', () => {
    expect(parseFlexibleIranDay('2025-09-23')).toBe('2025-09-23');
  });

  it('accepts Jalali with English digits and slash or dash', () => {
    expect(parseFlexibleIranDay('1404/07/01')).toBe('2025-09-23');
    expect(parseFlexibleIranDay('1404-7-1')).toBe('2025-09-23');
  });

  it('accepts Jalali with Persian digits', () => {
    expect(parseFlexibleIranDay('۱۴۰۴/۰۷/۰۱')).toBe('2025-09-23');
    expect(parseFlexibleIranDay('۱۴۰۴-۰۷-۰۱')).toBe('2025-09-23');
  });

  it('returns null for garbage', () => {
    expect(parseFlexibleIranDay('')).toBeNull();
    expect(parseFlexibleIranDay('abc')).toBeNull();
    expect(parseFlexibleIranDay('1404/13/01')).toBeNull();
  });
});

describe('lastNIranMonths', () => {
  it('includes current month and walks backward', () => {
    const now = new Date('2025-09-23T12:00:00+03:30'); // 1404/07/01
    const months = lastNIranMonths(now, 3);
    expect(months).toHaveLength(3);
    expect(months[months.length - 1]).toEqual({ year: 1404, month: 7 });
    expect(months[0]).toEqual({ year: 1404, month: 5 });
  });
});
