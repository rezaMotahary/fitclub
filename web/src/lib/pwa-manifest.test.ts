import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_LOGO } from "./brand";
import { PWA_BACKGROUND_COLOR, PWA_THEME_COLOR, pwaManifest } from "./pwa-manifest";

const publicDir = path.resolve(process.cwd(), "public");

function publicFile(url: string): string {
  return path.join(publicDir, url.replace(/^\//, "").replaceAll("/", path.sep));
}

describe("web app manifest", () => {
  it("names the app in Persian and opens the public home", () => {
    expect(pwaManifest.name).toBe("فیت‌کلاب");
    expect(pwaManifest.short_name).toBe("فیت‌کلاب");
    expect(pwaManifest.lang).toBe("fa-IR");
    expect(pwaManifest.dir).toBe("rtl");
    expect(pwaManifest.display).toBe("standalone");
    expect(pwaManifest.start_url).toBe("/");
    expect(pwaManifest.scope).toBe("/");
    expect(pwaManifest.id).toBe("/");
    expect(pwaManifest.prefer_related_applications).toBe(false);
  });

  it("uses the night brand colors for the install frame", () => {
    expect(pwaManifest.theme_color).toBe(PWA_THEME_COLOR);
    expect(pwaManifest.background_color).toBe(PWA_BACKGROUND_COLOR);
    expect(PWA_THEME_COLOR).toBe("#070b12");
    expect(PWA_BACKGROUND_COLOR).toBe("#070b12");
  });

  it("points at the existing install icons", () => {
    const sources = pwaManifest.icons.map((icon) => icon.src);
    expect(sources).toContain(BRAND_LOGO.pwa.icon192);
    expect(sources).toContain(BRAND_LOGO.pwa.icon512);
    expect(pwaManifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    expect(pwaManifest.icons.some((icon) => icon.sizes === "192x192")).toBe(true);
    expect(pwaManifest.icons.some((icon) => icon.sizes === "512x512")).toBe(true);
    for (const icon of pwaManifest.icons) {
      expect(existsSync(publicFile(icon.src))).toBe(true);
    }
  });

  it("does not mention private routes", () => {
    const text = JSON.stringify(pwaManifest);
    expect(text.includes("STAFF_PATH")).toBe(false);
    expect(text.includes("/reception")).toBe(false);
    expect(text.includes("/overview")).toBe(false);
  });
});
