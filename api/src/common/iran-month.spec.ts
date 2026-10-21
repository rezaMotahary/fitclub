import { describe, expect, it } from 'vitest';
import { iranMonthLabel, iranYearMonth, isSameIranMonth } from './iran-month.js';

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
