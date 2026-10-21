import { describe, expect, it } from 'vitest';
import { planReceptionPayment } from './reception-payment.js';
import { SubscriptionRuleError } from './subscription-period.js';

describe('planReceptionPayment', () => {
  const price = 890_000;
  const half = 445_000;

  it('allows partial installment after half is already paid', () => {
    const plan = planReceptionPayment({
      priceToman: price,
      amountPaidToman: half,
      paymentAmountToman: 100_000,
    });
    expect(plan.remainingBefore).toBe(half);
    expect(plan.amountPaidAfter).toBe(545_000);
    expect(plan.remainingAfter).toBe(345_000);
    expect(plan.fullySettled).toBe(false);
  });

  it('allows full settlement of remaining debt', () => {
    const plan = planReceptionPayment({
      priceToman: price,
      amountPaidToman: half,
      paymentAmountToman: half,
    });
    expect(plan.remainingAfter).toBe(0);
    expect(plan.fullySettled).toBe(true);
  });

  it('rejects amount over remaining debt', () => {
    expect(() =>
      planReceptionPayment({
        priceToman: price,
        amountPaidToman: half,
        paymentAmountToman: half + 1,
      }),
    ).toThrow(SubscriptionRuleError);
    try {
      planReceptionPayment({
        priceToman: price,
        amountPaidToman: half,
        paymentAmountToman: half + 1,
      });
    } catch (err) {
      expect((err as SubscriptionRuleError).code).toBe('OVER_REMAINING_DEBT');
    }
  });

  it('rejects zero / negative / non-integer amounts', () => {
    for (const paymentAmountToman of [0, -1, 100.5]) {
      expect(() =>
        planReceptionPayment({
          priceToman: price,
          amountPaidToman: half,
          paymentAmountToman,
        }),
      ).toThrow(SubscriptionRuleError);
    }
  });

  it('rejects when subscription has no debt', () => {
    expect(() =>
      planReceptionPayment({
        priceToman: price,
        amountPaidToman: price,
        paymentAmountToman: 1,
      }),
    ).toThrow(SubscriptionRuleError);
  });

  it('still forbids staying below half when completing a start payment', () => {
    expect(() =>
      planReceptionPayment({
        priceToman: price,
        amountPaidToman: 100_000,
        paymentAmountToman: 100_000,
      }),
    ).toThrow(SubscriptionRuleError);
    try {
      planReceptionPayment({
        priceToman: price,
        amountPaidToman: 100_000,
        paymentAmountToman: 100_000,
      });
    } catch (err) {
      expect((err as SubscriptionRuleError).code).toBe('BELOW_HALF_TUITION');
    }
  });

  it('allows a start-completing payment that reaches half', () => {
    const plan = planReceptionPayment({
      priceToman: price,
      amountPaidToman: 100_000,
      paymentAmountToman: half - 100_000,
    });
    expect(plan.amountPaidAfter).toBe(half);
    expect(plan.fullySettled).toBe(false);
  });
});
