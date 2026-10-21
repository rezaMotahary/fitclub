import { describe, expect, it } from "vitest";
import {
  clampTomanInput,
  formatTomanGrouped,
  formatTomanInputLive,
  numberToPersianWords,
  parseTomanInput,
  tomanAmountInWords,
} from "./amount-input";

describe("parseTomanInput", () => {
  it("accepts English digits", () => {
    expect(parseTomanInput("445000")).toBe(445_000);
    expect(parseTomanInput("445,000")).toBe(445_000);
  });

  it("accepts Persian digits with separators", () => {
    expect(parseTomanInput("۴۴۵۰۰۰")).toBe(445_000);
    expect(parseTomanInput("۴۴۵٬۰۰۰")).toBe(445_000);
    expect(parseTomanInput("۳٬۵۰۰٬۰۰۰")).toBe(3_500_000);
  });

  it("returns null for empty / non-numeric", () => {
    expect(parseTomanInput("")).toBeNull();
    expect(parseTomanInput("abc")).toBeNull();
  });
});

describe("clampTomanInput", () => {
  it("keeps Persian and English digits while typing", () => {
    expect(clampTomanInput("۱۲۳abc۴۵۶")).toBe("123456");
    expect(clampTomanInput("123,456")).toBe("123456");
    expect(clampTomanInput("۳٬۵۰۰٬۰۰۰")).toBe("3500000");
  });

  it("caps at 12 digits", () => {
    expect(clampTomanInput("123456789012999")).toBe("123456789012");
  });
});

describe("formatTomanInputLive / grouped", () => {
  it("formats English paste with Persian grouped digits", () => {
    expect(formatTomanInputLive("3500000")).toBe("۳٬۵۰۰٬۰۰۰");
    expect(formatTomanGrouped(3500000)).toBe("۳٬۵۰۰٬۰۰۰");
  });

  it("formats Persian typing with live separators", () => {
    expect(formatTomanInputLive("۳۵۰۰۰۰۰")).toBe("۳٬۵۰۰٬۰۰۰");
    expect(formatTomanInputLive("۴۴۵٬۰۰۰")).toBe("۴۴۵٬۰۰۰");
  });

  it("empty stays empty", () => {
    expect(formatTomanInputLive("")).toBe("");
    expect(formatTomanInputLive("abc")).toBe("");
  });
});

describe("tomanAmountInWords", () => {
  it("reads common tuition amounts in Persian", () => {
    expect(tomanAmountInWords(3_500_000)).toBe(
      "سه میلیون و پانصد هزار تومان",
    );
    expect(tomanAmountInWords(445_000)).toBe("چهارصد و چهل و پنج هزار تومان");
    expect(tomanAmountInWords(1_000_000)).toBe("یک میلیون تومان");
  });

  it("returns null for zero / invalid", () => {
    expect(tomanAmountInWords(0)).toBeNull();
    expect(numberToPersianWords(0)).toBe("صفر");
  });
});
