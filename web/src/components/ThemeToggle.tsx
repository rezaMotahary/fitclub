"use client";

import { useEffect, useState } from "react";
import { themeLabel, themeToggleLabel } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

type ThemeToggleProps = {
  className?: string;
  /** Compact icon-style control for tight headers */
  compact?: boolean;
};

export function ThemeToggle({ className = "", compact = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Until mount, keep SSR/client markup identical (avoids hydration overlay blocking forms).
  const nextLabel = mounted ? themeToggleLabel(theme) : "تغییر تم";
  const currentLabel = mounted ? themeLabel(theme) : "تم";
  const icon = !mounted ? "◐" : theme === "light" ? "☾" : "☀";
  const text = !mounted ? "تم" : theme === "light" ? "شب" : "روز";

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " theme-toggle-compact" : ""}${className ? ` ${className}` : ""}`}
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {icon}
      </span>
      {!compact ? <span className="theme-toggle-text">{text}</span> : null}
      <span className="sr-only">
        الان: {currentLabel}. {nextLabel}
      </span>
    </button>
  );
}
