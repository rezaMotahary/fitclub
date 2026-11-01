import { describe, expect, it } from "vitest";
import { addGregorianDays, saleStartChoices } from "./iran-day";

describe("sale start day", () => {
  it("allows today and the next day, never a past day", () => {
    const choices = saleStartChoices("2026-10-31");
    expect(choices.today).toBe("2026-10-31");
    expect(choices.tomorrow).toBe("2026-11-01");
    expect(addGregorianDays(choices.today, -1) < choices.today).toBe(true);
    expect(choices.tomorrow > choices.today).toBe(true);
  });
});
