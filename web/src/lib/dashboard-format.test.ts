import { describe, expect, it } from "vitest";
import {
  formatDurationMinutes,
  formatToman,
  paymentMethodLabel,
} from "./dashboard-format";

describe("dashboard-format", () => {
  it("formats duration in Persian digits", () => {
    expect(formatDurationMinutes(80)).toContain("ساعت");
    expect(formatDurationMinutes(45)).toContain("دقیقه");
    expect(formatDurationMinutes(null)).toBe("—");
  });

  it("labels payment methods in Persian", () => {
    expect(paymentMethodLabel("CASH")).toBe("نقد");
    expect(paymentMethodLabel("CARD_READER")).toBe("کارت‌خوان");
  });

  it("formats toman with fa-IR digits", () => {
    const label = formatToman(1_190_000);
    expect(label).toContain("تومان");
    expect(label).toMatch(/[۰-۹]/);
  });
});
