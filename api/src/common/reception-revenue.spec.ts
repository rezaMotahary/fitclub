import { describe, expect, it } from 'vitest';
import { buildReceptionRevenue } from './reception-revenue.js';

function pay(amountToman: number, iso: string) {
  return { amountToman, paidAt: new Date(iso) };
}

describe('buildReceptionRevenue', () => {
  const now = new Date('2025-09-25T12:00:00+03:30'); // 1404/07/03

  const payments = [
    pay(100_000, '2025-09-23T10:00:00+03:30'), // Mehr 1
    pay(200_000, '2025-09-25T11:00:00+03:30'), // today
    pay(50_000, '2025-09-25T18:00:00+03:30'), // today later
    pay(300_000, '2025-08-25T12:00:00+03:30'), // previous Jalali month (Shahrivar)
    pay(80_000, '2025-10-22T09:00:00+03:30'), // last day of Mehr — outside selected 23–25 range
  ];

  it('sums today, this Jalali month, and a custom day range', () => {
    const result = buildReceptionRevenue({
      payments,
      now,
      rangeFromDay: '2025-09-23',
      rangeToDay: '2025-09-25',
      monthlyLookback: 3,
    });

    expect(result.today.amountToman).toBe(250_000);
    expect(result.today.paymentCount).toBe(2);
    expect(result.today.day).toBe('2025-09-25');

    expect(result.thisMonth.amountToman).toBe(430_000); // 100+200+50+80
    expect(result.thisMonth.iranYear).toBe(1404);
    expect(result.thisMonth.iranMonth).toBe(7);
    expect(result.thisMonth.monthLabel.length).toBeGreaterThan(3);

    expect(result.range.amountToman).toBe(350_000); // 100+200+50
    expect(result.range.paymentCount).toBe(3);
    expect(result.range.fromDay).toBe('2025-09-23');
    expect(result.range.toDay).toBe('2025-09-25');
  });

  it('builds a daily series with zeros for empty days', () => {
    const result = buildReceptionRevenue({
      payments,
      now,
      rangeFromDay: '2025-09-23',
      rangeToDay: '2025-09-25',
      monthlyLookback: 3,
    });

    expect(result.daily).toHaveLength(3);
    expect(result.daily[0]).toMatchObject({
      day: '2025-09-23',
      amountToman: 100_000,
      paymentCount: 1,
    });
    expect(result.daily[1]).toMatchObject({
      day: '2025-09-24',
      amountToman: 0,
      paymentCount: 0,
    });
    expect(result.daily[2].amountToman).toBe(250_000);
    expect(result.daily[0].label.length).toBeGreaterThan(0);
  });

  it('builds recent Jalali months including current', () => {
    const result = buildReceptionRevenue({
      payments,
      now,
      rangeFromDay: '2025-09-23',
      rangeToDay: '2025-09-25',
      monthlyLookback: 3,
    });

    expect(result.monthly).toHaveLength(3);
    const current = result.monthly[result.monthly.length - 1];
    expect(current.iranYear).toBe(1404);
    expect(current.iranMonth).toBe(7);
    expect(current.amountToman).toBe(430_000);

    const previous = result.monthly[result.monthly.length - 2];
    expect(previous.amountToman).toBe(300_000);
  });

  it('ignores unconfirmed-shaped zero/empty lists without throwing', () => {
    const result = buildReceptionRevenue({
      payments: [],
      now,
      rangeFromDay: '2025-09-23',
      rangeToDay: '2025-09-23',
      monthlyLookback: 1,
    });
    expect(result.today.amountToman).toBe(0);
    expect(result.range.amountToman).toBe(0);
    expect(result.daily).toHaveLength(1);
  });
});
