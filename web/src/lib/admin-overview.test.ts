import { describe, expect, it } from "vitest";
import {
  buildAdminOverviewQuery,
  parseJalaliDateInput,
  parsePercentInput,
  scaleChartBars,
} from "./admin-overview";

describe("parseJalaliDateInput", () => {
  it("accepts English digits with slash or dash", () => {
    expect(parseJalaliDateInput("1404/07/01")).toBe("1404-07-01");
    expect(parseJalaliDateInput("1404-7-1")).toBe("1404-07-01");
  });

  it("accepts Persian digits", () => {
    expect(parseJalaliDateInput("۱۴۰۴/۰۷/۰۱")).toBe("1404-07-01");
    expect(parseJalaliDateInput("۱۴۰۴-۰۷-۰۱")).toBe("1404-07-01");
  });

  it("rejects garbage and impossible months", () => {
    expect(parseJalaliDateInput("")).toBeNull();
    expect(parseJalaliDateInput("abc")).toBeNull();
    expect(parseJalaliDateInput("1404/13/01")).toBeNull();
    expect(parseJalaliDateInput("2025-09-23")).toBeNull();
  });
});

describe("parsePercentInput", () => {
  it("accepts English and Persian digits including zero", () => {
    expect(parsePercentInput("0")).toBe(0);
    expect(parsePercentInput("۱۰")).toBe(10);
    expect(parsePercentInput("15")).toBe(15);
  });

  it("rejects empty, over 100, and non-integers", () => {
    expect(parsePercentInput("")).toBeNull();
    expect(parsePercentInput("۱۰۱")).toBeNull();
    expect(parsePercentInput("-1")).toBeNull();
    expect(parsePercentInput("12.5")).toBeNull();
  });
});

describe("buildAdminOverviewQuery", () => {
  it("sends month filter when no custom range", () => {
    expect(
      buildAdminOverviewQuery({
        iranYear: 1404,
        iranMonth: 8,
        fromInput: "",
        toInput: "",
      }),
    ).toEqual({ iranYear: "1404", iranMonth: "8" });
  });

  it("sends custom Jalali range when both dates parse", () => {
    expect(
      buildAdminOverviewQuery({
        iranYear: 1404,
        iranMonth: 8,
        fromInput: "۱۴۰۴/۰۷/۰۱",
        toInput: "1404/07/03",
      }),
    ).toEqual({ from: "1404-07-01", to: "1404-07-03" });
  });

  it("returns an error when only one side of the range is filled", () => {
    const result = buildAdminOverviewQuery({
      iranYear: 1404,
      iranMonth: 8,
      fromInput: "1404/07/01",
      toInput: "",
    });
    expect("error" in result).toBe(true);
  });
});

describe("scaleChartBars", () => {
  it("scales against the max amount and keeps zeros at zero", () => {
    const bars = scaleChartBars(
      [
        { label: "الف", amountToman: 100 },
        { label: "ب", amountToman: 0 },
        { label: "ج", amountToman: 50 },
      ],
      100,
    );
    expect(bars[0].height).toBe(100);
    expect(bars[1].height).toBe(0);
    expect(bars[2].height).toBe(50);
  });

  it("does not divide by zero on empty/all-zero series", () => {
    const bars = scaleChartBars([{ label: "خالی", amountToman: 0 }], 80);
    expect(bars[0].height).toBe(0);
  });
});
