import { describe, expect, it } from "vitest";
import { formatElapsed, resultLabel } from "./attendance-format";
import { toAsciiDigits } from "./auth";

describe("attendance-format", () => {
  it("formats timer as HH:MM:SS", () => {
    expect(formatElapsed(0)).toBe("00:00:00");
    expect(formatElapsed(65)).toBe("00:01:05");
    expect(formatElapsed(3723)).toBe("01:02:03");
  });

  it("labels voided and reject results in Persian", () => {
    expect(resultLabel("SUCCESS", true)).toBe("باطل‌شده");
    expect(resultLabel("REJECTED_DEBT", false)).toContain("بدهی");
  });
});

describe("search digits for attendance path", () => {
  it("accepts Persian and English mobile digits the same way", () => {
    expect(toAsciiDigits("۰۹۱۲۱۲۳۴۵۶۷")).toBe("09121234567");
    expect(toAsciiDigits("09121234567")).toBe("09121234567");
  });
});
