import { describe, expect, it } from "vitest";
import { sitePlanNote } from "./site-plans";

describe("sitePlanNote", () => {
  it("keeps sessions-per-month copy for weekly caps", () => {
    expect(sitePlanNote(2)).toContain("۸ جلسه");
    expect(sitePlanNote(3)).toContain("۱۲ جلسه");
    expect(sitePlanNote(4)).toContain("۱۶ جلسه");
  });

  it("uses full-access copy for every-day plan", () => {
    expect(sitePlanNote(7)).toMatch(/دسترسی کامل/);
  });
});
