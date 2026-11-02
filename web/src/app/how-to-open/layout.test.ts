import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "page.tsx"), "utf8");
const css = readFileSync(join(here, "../globals.css"), "utf8");

function cssBlock(selector: string): string {
  const start = css.indexOf(selector);
  expect(start).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("how-to-open layout", () => {
  it("keeps each role in its own card with a login button", () => {
    expect(page).toContain('className="role-card"');
    expect(page).toContain("ورود منشی");
    expect(page).toContain("ورود ادمین");
    expect(page).toContain("ورود عضو");
    expect(page).toContain("secretary@fitclub.local / FitClubSecretary1!");
    expect(page).toContain("admin@fitclub.local / FitClubAdmin1!");
    expect(page).toContain("09121234567");
    expect(page).toContain("123456");
  });

  it("puts latin account values in an isolated ltr run so ! stays put", () => {
    expect(page).toContain('className="ltr-isolate"');
    expect(page).toContain('dir="ltr"');
    expect(cssBlock(".ltr-isolate {")).toContain("unicode-bidi: isolate");
  });

  it("breaks a long address inside the card", () => {
    expect(page).toContain('className="url-break"');
    const block = cssBlock(".url-break");
    expect(block).toContain("overflow-wrap: anywhere");
    expect(block).toContain("max-width: 100%");
    expect(block).not.toContain("inline-block");
    const isolate = cssBlock(".ltr-isolate {");
    expect(isolate).toContain("max-width: 100%");
    expect(isolate).toContain("overflow-wrap: anywhere");
  });
});
