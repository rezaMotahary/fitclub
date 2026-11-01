import { describe, expect, it } from "vitest";
import {
  memberSearchNotice,
  slicePage,
} from "./reception-list";

describe("reception list pages", () => {
  const people = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

  it("hides nothing: page 2 continues after the first eight", () => {
    const page1 = slicePage(people, 1, 8);
    const page2 = slicePage(people, 2, 8);
    expect(page1.items).toEqual(people.slice(0, 8));
    expect(page2.items).toEqual(["i"]);
    expect(page1.pageCount).toBe(2);
    expect(page2.page).toBe(2);
    expect(page1.items.some((id) => page2.items.includes(id))).toBe(false);
  });

  it("keeps a single page when the list is short", () => {
    const page = slicePage(people.slice(0, 2), 1, 8);
    expect(page.pageCount).toBe(1);
    expect(page.items).toHaveLength(2);
  });

  it("clamps an empty list and a page past the end", () => {
    expect(slicePage([], 3, 8)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
    expect(slicePage(people, 9, 8).page).toBe(2);
  });
});

describe("member search notice", () => {
  it("says found or not found without a page-wide banner", () => {
    expect(memberSearchNotice(0)).toEqual({ error: "عضوی پیدا نشد." });
    expect(memberSearchNotice(13).ok).toContain("عضو پیدا شد");
    expect(memberSearchNotice(13).error).toBeUndefined();
  });
});
