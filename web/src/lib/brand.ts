export const BRAND_LOGO_SIZES = [
  16, 32, 48, 64, 128, 180, 192, 256, 512, 1024,
] as const;

export type BrandLogoSize = (typeof BRAND_LOGO_SIZES)[number];

function sizedUrls(theme: "dark" | "light"): Record<BrandLogoSize, string> {
  return Object.fromEntries(
    BRAND_LOGO_SIZES.map((size) => [size, `/brand/${theme}/logo-${size}.png`]),
  ) as Record<BrandLogoSize, string>;
}

/** Public paths for the approved FitClub mark (concept A). */
export const BRAND_LOGO = {
  dark: {
    src: "/brand/dark/logo.png",
    sized: sizedUrls("dark"),
  },
  light: {
    src: "/brand/light/logo.png",
    sized: sizedUrls("light"),
  },
  pwa: {
    icon192: "/brand/pwa/icon-192.png",
    icon512: "/brand/pwa/icon-512.png",
    appleTouchIcon: "/brand/pwa/apple-touch-icon.png",
  },
  favicon: {
    ico: "/brand/favicon.ico",
    png16: "/brand/favicon-16.png",
    png32: "/brand/favicon-32.png",
  },
} as const;
