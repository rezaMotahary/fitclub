"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  applyThemeToDocument,
  bootstrapTheme,
  oppositeTheme,
  type ThemeMode,
  writeStoredTheme,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    setThemeState(bootstrapTheme());
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    applyThemeToDocument(next);
    writeStoredTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = oppositeTheme(current);
      applyThemeToDocument(next);
      writeStoredTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme باید داخل ThemeProvider باشد");
  }
  return ctx;
}
