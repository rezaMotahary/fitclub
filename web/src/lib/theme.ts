export const THEME_STORAGE_KEY = "fitclub-theme";

export type ThemeMode = "light" | "dark";

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark";
}

/** Prefer stored choice; otherwise system preference; default dark (Cyan Night brand). */
export function resolveInitialTheme(
  stored: string | null | undefined,
  prefersLight: boolean,
): ThemeMode {
  if (isThemeMode(stored)) return stored;
  return prefersLight ? "light" : "dark";
}

export function oppositeTheme(theme: ThemeMode): ThemeMode {
  return theme === "light" ? "dark" : "light";
}

export function themeLabel(theme: ThemeMode): string {
  return theme === "light" ? "تم روشن" : "تم تاریک";
}

export function themeToggleLabel(theme: ThemeMode): string {
  return theme === "light" ? "رفتن به تم تاریک" : "رفتن به تم روشن";
}

export function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore quota / private mode
  }
}

export function detectPrefersLight(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  } catch {
    return false;
  }
}

export function bootstrapTheme(): ThemeMode {
  const theme = resolveInitialTheme(readStoredTheme(), detectPrefersLight());
  applyThemeToDocument(theme);
  return theme;
}

/** Inline script for <head> to avoid flash of wrong theme before React hydrates. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;
