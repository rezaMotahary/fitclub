/**
 * Manual reception payments (installment / settle remaining tuition).
 * docs/business-rules.md §6 — half rule only for starting a period;
 * later installments may be any amount up to remaining debt.
 */
import { minimumHalfTuition, tuitionDebt } from './subscription-pricing.js';
import { SubscriptionRuleError } from './subscription-period.js';

export type ReceptionPaymentInput = {
  priceToman: number;
  amountPaidToman: number;
  paymentAmountToman: number;
};

export type ReceptionPaymentPlan = {
  remainingBefore: number;
  remainingAfter: number;
  amountPaidAfter: number;
  fullySettled: boolean;
};

/**
 * Validates and plans an installment on an already-started (or start-completing) subscription.
 * - payment must be > 0 and ≤ remaining debt
 * - if paid so far is still below half, this payment must reach at least half
 *   (same gate as starting the period)
 * - once half is met, any partial settlement is allowed
 */
export function planReceptionPayment(
  input: ReceptionPaymentInput,
): ReceptionPaymentPlan {
  const { priceToman, amountPaidToman, paymentAmountToman } = input;
  const remainingBefore = tuitionDebt(priceToman, amountPaidToman);

  if (remainingBefore <= 0) {
    throw new SubscriptionRuleError(
      'این اشتراک بدهی شهریه ندارد',
      'NO_TUITION_DEBT',
    );
  }

  if (!Number.isInteger(paymentAmountToman) || paymentAmountToman <= 0) {
    throw new SubscriptionRuleError(
      'مبلغ پرداخت باید عدد صحیح مثبت باشد',
      'INVALID_PAYMENT_AMOUNT',
    );
  }

  if (paymentAmountToman > remainingBefore) {
    throw new SubscriptionRuleError(
      `مبلغ بیشتر از ماندهٔ بدهی است (مانده ${remainingBefore.toLocaleString('fa-IR')} تومان)`,
      'OVER_REMAINING_DEBT',
    );
  }

  const half = minimumHalfTuition(priceToman);
  const amountPaidAfter = amountPaidToman + paymentAmountToman;

  if (amountPaidToman < half && amountPaidAfter < half) {
    throw new SubscriptionRuleError(
      `پرداخت کمتر از نصف شهریه برای شروع دوره مجاز نیست (حداقل ${half.toLocaleString('fa-IR')} تومان)`,
      'BELOW_HALF_TUITION',
    );
  }

  const remainingAfter = tuitionDebt(priceToman, amountPaidAfter);
  return {
    remainingBefore,
    remainingAfter,
    amountPaidAfter,
    fullySettled: remainingAfter === 0,
  };
}

export { tuitionDebt };
