import { describe, expect, it } from "vitest";
import {
  minimumHalfTuition,
  previewRenewTuition,
  SAMPLE_EARLY_RENEWAL_DISCOUNT_PERCENT,
} from "./renew-preview";

describe("previewRenewTuition", () => {
  it("applies sample early discount only before period ends", () => {
    expect(
      previewRenewTuition({
        planPriceToman: 1_000_000,
        renewingBeforeCurrentEnds: true,
      }),
    ).toEqual({
      priceToman: 900_000,
      discountPercent: SAMPLE_EARLY_RENEWAL_DISCOUNT_PERCENT,
    });

    expect(
      previewRenewTuition({
        planPriceToman: 1_000_000,
        renewingBeforeCurrentEnds: false,
      }),
    ).toEqual({ priceToman: 1_000_000, discountPercent: 0 });
  });

  it("half of discounted tuition for start payment", () => {
    expect(minimumHalfTuition(900_000)).toBe(450_000);
  });
});
