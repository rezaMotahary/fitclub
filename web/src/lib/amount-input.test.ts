import { describe, expect, it } from "vitest";
import { clampTomanInput, parseTomanInput } from "./amount-input";

describe("parseTomanInput", () => {
  it("accepts English digits", () => {
    expect(parseTomanInput("445000")).toBe(445_000);
    expect(parseTomanInput("445,000")).toBe(445_000);
  });

  it("accepts Persian digits", () => {
    expect(parseTomanInput("۴۴۵۰۰۰")).toBe(445_000);
    expect(parseTomanInput("۴۴۵٬۰۰۰")).toBe(445_000);
  });

  it("returns null for empty / non-numeric", () => {
    expect(parseTomanInput("")).toBeNull();
    expect(parseTomanInput("abc")).toBeNull();
  });
});

describe("clampTomanInput", () => {
  it("keeps Persian and English digits while typing", () => {
    expect(clampTomanInput("۱۲۳abc۴۵۶")).toBe("۱۲۳۴۵۶");
    expect(clampTomanInput("123,456")).toBe("123,456");
  });
});
