import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PWA_CACHE_NAME,
  PWA_PRECACHE_URLS,
  PWA_PUBLIC_NAVIGATIONS,
  isBrandOrImageAsset,
  shouldBypassServiceWorker,
  shouldCacheNavigation,
} from "./pwa-sw-policy";

const webRoot = process.cwd();

function read(relative: string): string {
  return readFileSync(path.join(webRoot, relative), "utf8");
}

describe("service worker policy", () => {
  it("leaves API calls and non-GET requests alone", () => {
    expect(shouldBypassServiceWorker("/api/auth/me", "GET")).toBe(true);
    expect(shouldBypassServiceWorker("/api/health", "POST")).toBe(true);
    expect(shouldBypassServiceWorker("/", "POST")).toBe(true);
    expect(shouldBypassServiceWorker("/", "GET")).toBe(false);
  });

  it("caches only the public pages", () => {
    expect(shouldCacheNavigation("/")).toBe(true);
    expect(shouldCacheNavigation("/offline")).toBe(true);
    expect(shouldCacheNavigation("/login/member")).toBe(true);
    expect(shouldCacheNavigation("/member")).toBe(false);
    expect(shouldCacheNavigation("/how-to-open")).toBe(false);
  });

  it("caches brand images and not other paths", () => {
    expect(isBrandOrImageAsset("/brand/pwa/icon-192.png")).toBe(true);
    expect(isBrandOrImageAsset("/images/hero.jpg")).toBe(true);
    expect(isBrandOrImageAsset("/member")).toBe(false);
  });
});

describe("public service worker file", () => {
  const sw = read("public/sw.js");

  it("exists, handles fetch, and matches the allowlist", () => {
    expect(sw.includes(`const CACHE = "${PWA_CACHE_NAME}"`)).toBe(true);
    expect(sw.includes('addEventListener("fetch"')).toBe(true);
    expect(sw.includes('request.method !== "GET"')).toBe(true);
    expect(sw.includes('path.startsWith("/api/")')).toBe(true);
    for (const url of PWA_PRECACHE_URLS) {
      expect(sw.includes(url)).toBe(true);
      if (url.startsWith("/brand/")) {
        expect(existsSync(path.join(webRoot, "public", url.slice(1)))).toBe(true);
      }
    }
    for (const url of PWA_PUBLIC_NAVIGATIONS) {
      expect(sw.includes(`"${url}"`)).toBe(true);
    }
  });

  it("does not name private routes", () => {
    expect(sw.includes("STAFF_PATH")).toBe(false);
    expect(sw.includes("secretary")).toBe(false);
    expect(sw.includes("admin")).toBe(false);
    expect(sw.includes("/reception")).toBe(false);
    expect(sw.includes("/overview")).toBe(false);
    expect(sw.includes("/how-to-open")).toBe(false);
    expect(sw.includes('"/member"')).toBe(false);
  });
});

describe("public install files do not embed staff tokens", () => {
  const files = [
    "public/sw.js",
    "src/app/manifest.ts",
    "src/lib/pwa-manifest.ts",
    "src/lib/pwa-install.ts",
    "src/lib/pwa-sw-policy.ts",
    "src/components/InstallPrompt.tsx",
    "src/app/offline/page.tsx",
    "src/app/layout.tsx",
  ];

  it("keeps env tokens out of the public install sources", () => {
    const envPath = path.join(webRoot, ".env.local");
    const tokens = existsSync(envPath) ? staffTokens(readFileSync(envPath, "utf8")) : [];
    const bundled = files.map((file) => read(file)).join("\n");
    for (const token of tokens) {
      expect(bundled.includes(token)).toBe(false);
    }
    expect(bundled.includes("STAFF_PATH")).toBe(false);
  });
});

function staffTokens(envText: string): string[] {
  const tokens: string[] = [];
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^STAFF_PATH_(?:SECRETARY|ADMIN)=(.*)$/);
    if (!match) continue;
    const value = match[1].trim().replace(/^["']|["']$/g, "");
    if (value.length >= 32) tokens.push(value);
  }
  return tokens;
}
