import { describe, expect, it } from 'vitest';
import {
  applyPercentDiscount,
  isTuitionDebtBlockingEntry,
  minimumHalfTuition,
  tuitionDebt,
} from './subscription-pricing.js';

describe('subscription-pricing', () => {
  it('requires ceil(half) as minimum payment', () => {
    expect(minimumHalfTuition(890_000)).toBe(445_000);
    expect(minimumHalfTuition(1_191_000)).toBe(595_500);
  });

  it('applies early-renewal percent discount', () => {
    expect(applyPercentDiscount(1_000_000, 10)).toBe(900_000);
    expect(applyPercentDiscount(1_000_000, 0)).toBe(1_000_000);
  });

  it('debt blocks entry from day 15 when half-paid', () => {
    const price = 890_000;
    const half = 445_000;

    expect(
      isTuitionDebtBlockingEntry({
        dayNumber: 10,
        priceToman: price,
        amountPaidToman: half,
      }),
    ).toBe(false);

    expect(
      isTuitionDebtBlockingEntry({
        dayNumber: 16,
        priceToman: price,
        amountPaidToman: half,
      }),
    ).toBe(true);

    expect(
      isTuitionDebtBlockingEntry({
        dayNumber: 16,
        priceToman: price,
        amountPaidToman: price,
      }),
    ).toBe(false);

    expect(
      isTuitionDebtBlockingEntry({
        dayNumber: 1,
        priceToman: price,
        amountPaidToman: half - 1,
      }),
    ).toBe(true);
  });

  it('computes remaining tuition debt', () => {
    expect(tuitionDebt(890_000, 445_000)).toBe(445_000);
    expect(tuitionDebt(890_000, 890_000)).toBe(0);
  });
});
