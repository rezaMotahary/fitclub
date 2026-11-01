import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_LOGO, BRAND_LOGO_SIZES } from "./brand";

const publicDir = path.resolve(process.cwd(), "public");

function publicFile(url: string): string {
  return path.join(publicDir, url.replace(/^\//, "").replaceAll("/", path.sep));
}

describe("brand logo assets", () => {
  it("keeps separate dark and light masters", () => {
    expect(existsSync(publicFile(BRAND_LOGO.dark.src))).toBe(true);
    expect(existsSync(publicFile(BRAND_LOGO.light.src))).toBe(true);
    expect(BRAND_LOGO.dark.src).not.toBe(BRAND_LOGO.light.src);
  });

  it.each(BRAND_LOGO_SIZES)("has dark and light files at %s px", (size) => {
    expect(existsSync(publicFile(BRAND_LOGO.dark.sized[size]))).toBe(true);
    expect(existsSync(publicFile(BRAND_LOGO.light.sized[size]))).toBe(true);
  });

  it("has PWA and favicon files ready", () => {
    expect(existsSync(publicFile(BRAND_LOGO.pwa.icon192))).toBe(true);
    expect(existsSync(publicFile(BRAND_LOGO.pwa.icon512))).toBe(true);
    expect(existsSync(publicFile(BRAND_LOGO.pwa.appleTouchIcon))).toBe(true);
    expect(existsSync(publicFile(BRAND_LOGO.favicon.ico))).toBe(true);
    expect(existsSync(publicFile(BRAND_LOGO.favicon.png16))).toBe(true);
    expect(existsSync(publicFile(BRAND_LOGO.favicon.png32))).toBe(true);
  });
});
