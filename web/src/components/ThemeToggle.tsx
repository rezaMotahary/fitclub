"use client";

import { themeLabel, themeToggleLabel } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

type ThemeToggleProps = {
  className?: string;
  /** Compact icon-style control for tight headers */
  compact?: boolean;
};

export function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = themeToggleLabel(theme);
  const currentLabel = themeLabel(theme);

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " theme-toggle-compact" : ""}${className ? ` ${className}` : ""}`}
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === "light" ? "☾" : "☀"}
      </span>
      {!compact ? (
        <span className="theme-toggle-text">
          {theme === "light" ? "شب" : "روز"}
        </span>
      ) : null}
      <span className="sr-only">الان: {currentLabel}. {nextLabel}</span>
    </button>
  );
}
