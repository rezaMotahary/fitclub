import { describe, expect, it } from "vitest";
import {
  isThemeMode,
  oppositeTheme,
  resolveInitialTheme,
  themeLabel,
  themeToggleLabel,
} from "./theme";

describe("theme helpers", () => {
  it("accepts only light and dark", () => {
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("system")).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });

  it("uses stored preference over system", () => {
    expect(resolveInitialTheme("light", false)).toBe("light");
    expect(resolveInitialTheme("dark", true)).toBe("dark");
  });

  it("falls back to system preference when nothing stored", () => {
    expect(resolveInitialTheme(null, true)).toBe("light");
    expect(resolveInitialTheme(undefined, false)).toBe("dark");
    expect(resolveInitialTheme("weird", true)).toBe("light");
  });

  it("toggles between modes", () => {
    expect(oppositeTheme("light")).toBe("dark");
    expect(oppositeTheme("dark")).toBe("light");
  });

  it("exposes Persian labels", () => {
    expect(themeLabel("light")).toBe("تم روشن");
    expect(themeLabel("dark")).toBe("تم تاریک");
    expect(themeToggleLabel("light")).toContain("تاریک");
    expect(themeToggleLabel("dark")).toContain("روشن");
  });
});
