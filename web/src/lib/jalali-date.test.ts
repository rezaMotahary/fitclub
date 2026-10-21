import { describe, expect, it } from "vitest";
import {
  dayStringToUtcNoon,
  formatJalaliDateTime,
  formatJalaliDay,
  formatJalaliInstantDay,
  isDayString,
} from "./jalali-date";

describe("jalali-date", () => {
  it("recognizes YYYY-MM-DD day strings", () => {
    expect(isDayString("2025-10-15")).toBe(true);
    expect(isDayString("2025-10-15T12:00:00Z")).toBe(false);
    expect(isDayString("")).toBe(false);
  });

  it("formats Gregorian day strings as Jalali long labels", () => {
    // 2025-10-15 Iran day → ۲۳ مهر ۱۴۰۴
    const label = formatJalaliDay("2025-10-15");
    expect(label).toContain("۱۴۰۴");
    expect(label).toContain("مهر");
    expect(label).toMatch(/۲۳/);
    expect(label).not.toMatch(/2025/);
    expect(label).not.toMatch(/Oct/i);
  });

  it("formats short Jalali numeric form", () => {
    const short = formatJalaliDay("2025-10-15", "short");
    expect(short).toMatch(/۱۴۰۴/);
    expect(short).toMatch(/۰۷/);
    expect(short).toMatch(/۲۳/);
    expect(short).not.toContain("2025");
  });

  it("returns empty for nullish and passthrough for invalid", () => {
    expect(formatJalaliDay(null)).toBe("");
    expect(formatJalaliDay(undefined)).toBe("");
    expect(formatJalaliDay("")).toBe("");
    expect(formatJalaliDay("not-a-day")).toBe("not-a-day");
  });

  it("anchors day conversion at UTC noon", () => {
    const d = dayStringToUtcNoon("2025-10-15");
    expect(d.toISOString()).toBe("2025-10-15T12:00:00.000Z");
  });

  it("formats ISO instants with Jalali date in Tehran", () => {
    // Midday Tehran-ish on 2025-10-15
    const iso = "2025-10-15T09:30:00.000Z";
    const day = formatJalaliInstantDay(iso);
    expect(day).toContain("۱۴۰۴");
    expect(day).toContain("مهر");
    expect(day).not.toContain("2025");

    const withTime = formatJalaliDateTime(iso);
    expect(withTime).toContain("۱۴۰۴");
    expect(withTime).toMatch(/\d|۰|۱|۲|۳|۴|۵|۶|۷|۸|۹/);
  });
});
