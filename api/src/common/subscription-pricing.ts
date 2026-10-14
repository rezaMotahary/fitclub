/**
 * Tuition / early-renewal pricing — docs/business-rules.md §5–6.
 * Prices are sample data until the owner sets real tariffs.
 */

/** Minimum payment to start a period = half the (discounted) tuition. */
export function minimumHalfTuition(priceToman: number): number {
  if (priceToman < 0) {
    throw new Error('priceToman must be non-negative');
  }
  return Math.ceil(priceToman / 2);
}

export function applyPercentDiscount(
  priceToman: number,
  discountPercent: number,
): number {
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('discountPercent must be between 0 and 100');
  }
  if (priceToman < 0) {
    throw new Error('priceToman must be non-negative');
  }
  const discounted = Math.round(priceToman * (1 - discountPercent / 100));
  return Math.max(0, discounted);
}

export function tuitionDebt(priceToman: number, amountPaidToman: number): number {
  return Math.max(0, priceToman - amountPaidToman);
}

/**
 * Debt blocks entry only for remaining tuition of the same subscription.
 * - paid < half → always blocked (period should not have started)
 * - half ≤ paid < full → open on days 1–14; blocked from day 15 until settled
 * - paid ≥ full → never blocked by debt
 */
export function isTuitionDebtBlockingEntry(params: {
  dayNumber: number;
  priceToman: number;
  amountPaidToman: number;
}): boolean {
  const { dayNumber, priceToman, amountPaidToman } = params;
  if (dayNumber < 1) return true;

  const half = minimumHalfTuition(priceToman);
  if (amountPaidToman < half) return true;
  if (amountPaidToman >= priceToman) return false;
  return dayNumber >= 15;
}
