/** Wait before the card appears so it does not flash on every arrival. */
export const PWA_INSTALL_DELAY_MS = 4000;

/** "Later" stays quiet for a week. */
export const PWA_INSTALL_LATER_MS = 7 * 24 * 60 * 60 * 1000;

export const PWA_INSTALL_LATER_KEY = "fitclub-pwa-install-later";

const OFFER_PATHS = new Set(["/", "/member", "/login/member"]);

export function shouldOfferInstallOnPath(pathname: string): boolean {
  return OFFER_PATHS.has(pathname);
}

export function parseInstallLaterAt(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function readInstallLaterAt(
  storage: { getItem(key: string): string | null } | null | undefined,
): number | null {
  if (!storage) return null;
  try {
    return parseInstallLaterAt(storage.getItem(PWA_INSTALL_LATER_KEY));
  } catch {
    return null;
  }
}

export function shouldShowInstallBanner(input: {
  standalone: boolean;
  dismissedAt: number | null;
  now: number;
  laterMs?: number;
}): boolean {
  if (input.standalone) return false;
  const laterMs = input.laterMs ?? PWA_INSTALL_LATER_MS;
  if (input.dismissedAt != null && input.now - input.dismissedAt < laterMs) {
    return false;
  }
  return true;
}

export function isIosInstallGuide(input: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): boolean {
  if (/iphone|ipad|ipod/i.test(input.userAgent)) return true;
  return input.platform === "MacIntel" && input.maxTouchPoints > 1;
}

export function isStandaloneDisplay(input: {
  displayModeStandalone: boolean;
  iosStandalone: boolean;
}): boolean {
  return input.displayModeStandalone || input.iosStandalone;
}

/** Stash the browser install event before React loads, without naming any route. */
export const PWA_INSTALL_BOOTSTRAP_SCRIPT = `
window.__fitclubInstall = null;
window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  window.__fitclubInstall = event;
  window.dispatchEvent(new Event("fitclub-install-available"));
});
`;
