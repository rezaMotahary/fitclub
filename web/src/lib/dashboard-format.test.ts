import { describe, expect, it } from "vitest";
import {
  formatChartAmount,
  formatDurationMinutes,
  formatPageStatus,
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

  it("puts a compact readable amount on chart bars without mouse", () => {
    expect(formatChartAmount(0)).toMatch(/۰|0/);
    expect(formatChartAmount(1_995_000)).toMatch(/[۰-۹]/);
    expect(formatChartAmount(890_000)).toMatch(/[۰-۹]/);
    expect(formatChartAmount(1_995_000).length).toBeLessThan(formatToman(1_995_000).length);
  });

  it("labels pager as صفحه ۲ از ۱۰ with Persian digits", () => {
    expect(formatPageStatus(2, 10)).toBe("صفحه ۲ از ۱۰");
    expect(formatPageStatus(1, 1)).toBe("صفحه ۱ از ۱");
  });
});
