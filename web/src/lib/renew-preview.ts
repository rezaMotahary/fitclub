/**
 * Client preview of early-renewal price.
 * Default 10 matches sample ClubSettings; payment desk loads the live percent.
 * Server remains source of truth on POST /subscriptions/renew.
 */
export const SAMPLE_EARLY_RENEWAL_DISCOUNT_PERCENT = 10;

export function previewRenewTuition(params: {
  planPriceToman: number;
  renewingBeforeCurrentEnds: boolean;
  earlyDiscountPercent?: number;
}): { priceToman: number; discountPercent: number } {
  const {
    planPriceToman,
    renewingBeforeCurrentEnds,
    earlyDiscountPercent = SAMPLE_EARLY_RENEWAL_DISCOUNT_PERCENT,
  } = params;
  if (!renewingBeforeCurrentEnds || earlyDiscountPercent <= 0) {
    return { priceToman: planPriceToman, discountPercent: 0 };
  }
  return {
    priceToman: Math.round(planPriceToman * (1 - earlyDiscountPercent / 100)),
    discountPercent: earlyDiscountPercent,
  };
}

export function minimumHalfTuition(priceToman: number): number {
  return Math.ceil(priceToman / 2);
}
