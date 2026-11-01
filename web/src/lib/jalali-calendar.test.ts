import { describe, expect, it } from "vitest";
import { parseJalaliDateInput } from "./admin-overview";
import {
  formatJalaliFieldValue,
  jalaliMonthGrid,
  jalaliMonthLength,
  jalaliMonthName,
  shiftJalaliMonth,
} from "./jalali-calendar";

describe("jalaliMonthLength", () => {
  it("gives 31 days for Farvardin and 30 for Mehr", () => {
    expect(jalaliMonthLength(1404, 1)).toBe(31);
    expect(jalaliMonthLength(1404, 7)).toBe(30);
  });
});

describe("formatJalaliFieldValue", () => {
  it("is accepted by parseJalaliDateInput in Persian and English digits", () => {
    const fa = formatJalaliFieldValue(1404, 7, 1);
    expect(parseJalaliDateInput(fa)).toBe("1404-07-01");
    expect(parseJalaliDateInput("1404/7/1")).toBe("1404-07-01");
    expect(parseJalaliDateInput("۱۴۰۴/۰۷/۰۱")).toBe("1404-07-01");
  });
});

describe("jalaliMonthGrid", () => {
  it("lists every day of Mehr 1404 without Gregorian labels", () => {
    const grid = jalaliMonthGrid(1404, 7);
    const days = grid.filter((c) => c.day != null).map((c) => c.day);
    expect(days[0]).toBe(1);
    expect(days.at(-1)).toBe(30);
    expect(days).toHaveLength(30);
    expect(grid.length % 7).toBe(0);
    const first = grid.find((c) => c.day === 1);
    expect(first?.value).toBeTruthy();
    expect(parseJalaliDateInput(first!.value)).toBe("1404-07-01");
    expect(jalaliMonthName(7)).toBe("مهر");
  });
});

describe("shiftJalaliMonth", () => {
  it("wraps Esfand to next Farvardin", () => {
    expect(shiftJalaliMonth(1404, 12, 1)).toEqual({ year: 1405, month: 1 });
    expect(shiftJalaliMonth(1404, 1, -1)).toEqual({ year: 1403, month: 12 });
  });
});
