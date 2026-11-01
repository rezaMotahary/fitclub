import { describe, expect, it } from 'vitest';
import { resolveAdminRevenueRange } from './admin-overview-query.js';

describe('resolveAdminRevenueRange', () => {
  const now = new Date('2025-09-25T12:00:00+03:30'); // 1404/07/03

  it('defaults to the current Jalali month', () => {
    const range = resolveAdminRevenueRange({}, now);
    expect(range.ok).toBe(true);
    if (!range.ok) return;
    expect(range.fromDay).toBe('2025-09-23');
    expect(range.toDay).toBe('2025-10-22');
    expect(range.source).toBe('this-month');
  });

  it('uses iranYear + iranMonth when given', () => {
    const range = resolveAdminRevenueRange({ iranYear: 1404, iranMonth: 6 }, now);
    expect(range.ok).toBe(true);
    if (!range.ok) return;
    expect(range.fromDay).toBe('2025-08-23');
    expect(range.toDay).toBe('2025-09-22');
    expect(range.source).toBe('month');
  });

  it('accepts Jalali from/to with Persian digits and they beat the month filter', () => {
    const range = resolveAdminRevenueRange(
      {
        iranYear: 1404,
        iranMonth: 7,
        from: '۱۴۰۴/۰۷/۰۱',
        to: '۱۴۰۴/۰۷/۰۳',
      },
      now,
    );
    expect(range.ok).toBe(true);
    if (!range.ok) return;
    expect(range.fromDay).toBe('2025-09-23');
    expect(range.toDay).toBe('2025-09-25');
    expect(range.source).toBe('custom');
  });

  it('rejects inverted or too-long ranges', () => {
    const inverted = resolveAdminRevenueRange(
      { from: '1404/07/10', to: '1404/07/01' },
      now,
    );
    expect(inverted.ok).toBe(false);

    const tooLong = resolveAdminRevenueRange(
      { from: '1403/01/01', to: '1404/07/01' },
      now,
    );
    expect(tooLong.ok).toBe(false);
  });

  it('rejects incomplete month or from/to pairs', () => {
    expect(resolveAdminRevenueRange({ iranYear: 1404 }, now).ok).toBe(false);
    expect(resolveAdminRevenueRange({ from: '1404/07/01' }, now).ok).toBe(false);
    expect(resolveAdminRevenueRange({ iranMonth: 13, iranYear: 1404 }, now).ok).toBe(
      false,
    );
  });
});
