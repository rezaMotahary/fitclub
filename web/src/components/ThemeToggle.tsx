"use client";

import { useEffect, useState } from "react";
import { themeLabel, themeToggleLabel } from "@/lib/theme";
import { useTheme } from "./ThemeProvider";

function ThemeMark({ kind }: { kind: "auto" | "sun" | "moon" }) {
  if (kind === "moon") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M15.5 3.2a8.8 8.8 0 1 0 5.3 15.4A8.2 8.2 0 0 1 15.5 3.2Z"
        />
      </svg>
    );
  }
  if (kind === "sun") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
        <path
          fill="currentColor"
          d="M11 2h2v3h-2zm0 17h2v3h-2zM2 11h3v2H2zm17 0h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zm12.1 12.1 1.4-1.4 2.1 2.1-1.4 1.4zM5.6 19.8l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3a9 9 0 1 0 0 18V3Z"
      />
    </svg>
  );
}

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
  const iconKind = !mounted ? "auto" : theme === "light" ? "moon" : "sun";
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
        <ThemeMark kind={iconKind} />
      </span>
      {!compact ? <span className="theme-toggle-text">{text}</span> : null}
      <span className="sr-only">
        الان: {currentLabel}. {nextLabel}
      </span>
    </button>
  );
}
