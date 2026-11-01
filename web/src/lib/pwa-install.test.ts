import { describe, expect, it } from "vitest";
import {
  PWA_INSTALL_DELAY_MS,
  PWA_INSTALL_LATER_KEY,
  PWA_INSTALL_LATER_MS,
  isIosInstallGuide,
  isStandaloneDisplay,
  parseInstallLaterAt,
  readInstallLaterAt,
  shouldOfferInstallOnPath,
  shouldShowInstallBanner,
} from "./pwa-install";

const WEEK = PWA_INSTALL_LATER_MS;
const NOW = 1_700_000_000_000;

describe("shouldShowInstallBanner", () => {
  it("hides the banner when the site is already installed", () => {
    expect(
      shouldShowInstallBanner({
        standalone: true,
        dismissedAt: null,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("hides the banner for a week after later", () => {
    expect(
      shouldShowInstallBanner({
        standalone: false,
        dismissedAt: NOW - WEEK + 1000,
        now: NOW,
      }),
    ).toBe(false);
  });

  it("shows the banner again after the quiet period", () => {
    expect(
      shouldShowInstallBanner({
        standalone: false,
        dismissedAt: NOW - WEEK - 1,
        now: NOW,
      }),
    ).toBe(true);
  });

  it("shows the banner when nothing was dismissed and the site is in the browser", () => {
    expect(
      shouldShowInstallBanner({
        standalone: false,
        dismissedAt: null,
        now: NOW,
      }),
    ).toBe(true);
  });
});

describe("install later storage", () => {
  it("ignores empty and broken values", () => {
    expect(parseInstallLaterAt(null)).toBeNull();
    expect(parseInstallLaterAt("")).toBeNull();
    expect(parseInstallLaterAt("soon")).toBeNull();
    expect(parseInstallLaterAt("0")).toBeNull();
  });

  it("reads a stored timestamp", () => {
    const storage = {
      getItem(key: string) {
        expect(key).toBe(PWA_INSTALL_LATER_KEY);
        return String(NOW);
      },
    };
    expect(readInstallLaterAt(storage)).toBe(NOW);
  });

  it("waits a few seconds and stays quiet for days", () => {
    expect(PWA_INSTALL_DELAY_MS).toBeGreaterThanOrEqual(3000);
    expect(PWA_INSTALL_LATER_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("shouldOfferInstallOnPath", () => {
  it("offers install on the public site, member login, and member home", () => {
    expect(shouldOfferInstallOnPath("/")).toBe(true);
    expect(shouldOfferInstallOnPath("/login/member")).toBe(true);
    expect(shouldOfferInstallOnPath("/member")).toBe(true);
  });

  it("does not offer install on other paths", () => {
    expect(shouldOfferInstallOnPath("/offline")).toBe(false);
    expect(shouldOfferInstallOnPath("/how-to-open")).toBe(false);
    expect(shouldOfferInstallOnPath("/admin")).toBe(false);
    expect(shouldOfferInstallOnPath("/secretary")).toBe(false);
    expect(shouldOfferInstallOnPath("/login/staff")).toBe(false);
  });
});

describe("install guide audience", () => {
  it("uses the share-sheet guide on iPhone and iPad", () => {
    expect(
      isIosInstallGuide({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
    expect(
      isIosInstallGuide({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      }),
    ).toBe(true);
  });

  it("does not use the share-sheet guide on desktop Chrome", () => {
    expect(
      isIosInstallGuide({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
        platform: "Win32",
        maxTouchPoints: 0,
      }),
    ).toBe(false);
  });

  it("treats an installed window as standalone", () => {
    expect(
      isStandaloneDisplay({ displayModeStandalone: true, iosStandalone: false }),
    ).toBe(true);
    expect(
      isStandaloneDisplay({ displayModeStandalone: false, iosStandalone: true }),
    ).toBe(true);
    expect(
      isStandaloneDisplay({ displayModeStandalone: false, iosStandalone: false }),
    ).toBe(false);
  });
});
