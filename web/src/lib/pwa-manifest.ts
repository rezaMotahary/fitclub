import { BRAND_LOGO } from "./brand";

/**
 * Install chrome is one fixed pair. The in-app day/night theme still switches.
 * Night background matches the default Cyan Night brand. Documented in docs/pwa.md.
 */
export const PWA_THEME_COLOR = "#070b12";
export const PWA_BACKGROUND_COLOR = "#070b12";

export const pwaManifest = {
  id: "/",
  name: "فیت‌کلاب",
  short_name: "فیت‌کلاب",
  description: "باشگاه بدنسازی فیت‌کلاب",
  lang: "fa-IR",
  dir: "rtl" as const,
  start_url: "/",
  scope: "/",
  display: "standalone" as const,
  background_color: PWA_BACKGROUND_COLOR,
  theme_color: PWA_THEME_COLOR,
  prefer_related_applications: false,
  icons: [
    {
      src: BRAND_LOGO.pwa.icon192,
      sizes: "192x192",
      type: "image/png",
      purpose: "any" as const,
    },
    {
      src: BRAND_LOGO.pwa.icon512,
      sizes: "512x512",
      type: "image/png",
      purpose: "any" as const,
    },
    {
      src: BRAND_LOGO.pwa.icon512,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable" as const,
    },
    {
      src: BRAND_LOGO.favicon.png32,
      sizes: "32x32",
      type: "image/png",
      purpose: "any" as const,
    },
  ],
};
