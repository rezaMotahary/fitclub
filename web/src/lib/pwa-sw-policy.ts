import { BRAND_LOGO } from "./brand";

/** Bumped when the public cache list changes. Keep in sync with public/sw.js. */
export const PWA_CACHE_NAME = "fitclub-public-v1";

/** Pages whose HTML may be stored. Personalized and private routes stay out. */
export const PWA_PUBLIC_NAVIGATIONS = ["/", "/offline", "/login/member"] as const;

export const PWA_PRECACHE_URLS = [
  "/offline",
  BRAND_LOGO.pwa.icon192,
  BRAND_LOGO.pwa.icon512,
  BRAND_LOGO.pwa.appleTouchIcon,
  BRAND_LOGO.favicon.png32,
  BRAND_LOGO.dark.src,
  BRAND_LOGO.light.src,
] as const;

export function shouldBypassServiceWorker(pathname: string, method: string): boolean {
  if (method !== "GET") return true;
  if (pathname === "/api" || pathname.startsWith("/api/")) return true;
  return false;
}

export function shouldCacheNavigation(pathname: string): boolean {
  return (PWA_PUBLIC_NAVIGATIONS as readonly string[]).includes(pathname);
}

export function isBrandOrImageAsset(pathname: string): boolean {
  return pathname.startsWith("/brand/") || pathname.startsWith("/images/");
}
