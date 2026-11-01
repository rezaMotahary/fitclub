import { describe, expect, it } from "vitest";
import {
  chartValueAxis,
  dailyChartLabelFlags,
  formatAxisTick,
  formatChartMillions,
  formatChartTip,
  formatDurationMinutes,
  formatPageStatus,
  formatToman,
  leadingJalaliDay,
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

  it("builds a million axis without putting the unit on every tick", () => {
    const axis = chartValueAxis(10_915_000);
    expect(axis.ticks.map((t) => t / 1_000_000)).toEqual([0, 5, 10, 15]);
    expect(axis.maxToman).toBe(15_000_000);
    expect(formatAxisTick(5_000_000)).toBe(
      (5).toLocaleString("fa-IR", { maximumFractionDigits: 0 }),
    );
    expect(formatAxisTick(2_500_000)).toBe(
      (2.5).toLocaleString("fa-IR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    );
    expect(formatAxisTick(5_000_000)).not.toMatch(/میلیون|هزار/);
    expect(chartValueAxis(890_000).ticks).toEqual([0, 500_000, 1_000_000]);
  });

  it("keeps a month-bar figure short and a hover tip in full toman", () => {
    const millions = formatChartMillions(11_000_000);
    expect(millions).toMatch(/۱۱/);
    expect(millions).not.toMatch(/میلیون|هزار/);
    expect(millions.length).toBeLessThan(8);
    const tip = formatChartTip("۵ آبان", 895_000);
    expect(tip).toContain("۵ آبان");
    expect(tip).toContain("تومان");
    expect(tip).not.toContain("میلیون");
    expect(formatChartMillions(890_000)).not.toContain("میلیون");
  });

  it("shows only spaced Jalali days on a daily chart, in Persian or English digits", () => {
    expect(leadingJalaliDay("۱۰ آبان")).toBe(10);
    expect(leadingJalaliDay("5 آبان")).toBe(5);
    expect(
      dailyChartLabelFlags(["۱ آبان", "۲ آبان", "۵ آبان", "۶ آبان", "۱۰ آبان"]),
    ).toEqual([true, false, true, false, true]);
    expect(dailyChartLabelFlags(["1 آبان", "4 آبان", "5 آبان"])).toEqual([
      true,
      false,
      true,
    ]);
    const month = Array.from({ length: 30 }, (_, i) => `${i + 1} آبان`);
    const flags = dailyChartLabelFlags(month);
    expect(flags.filter(Boolean)).toHaveLength(7);
    expect(flags[0]).toBe(true);
    expect(flags[29]).toBe(true);
    expect(flags[24]).toBe(true);
    expect(flags[28]).toBe(false);
  });

  it("labels pager as صفحه ۲ از ۱۰ with Persian digits", () => {
    expect(formatPageStatus(2, 10)).toBe("صفحه ۲ از ۱۰");
    expect(formatPageStatus(1, 1)).toBe("صفحه ۱ از ۱");
  });
});
