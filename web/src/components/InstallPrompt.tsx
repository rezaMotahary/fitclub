"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import {
  PWA_INSTALL_DELAY_MS,
  PWA_INSTALL_LATER_KEY,
  isIosInstallGuide,
  isStandaloneDisplay,
  readInstallLaterAt,
  shouldOfferInstallOnPath,
  shouldShowInstallBanner,
} from "@/lib/pwa-install";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type BannerMode = "hidden" | "install" | "guide";

function detectStandalone(): boolean {
  const displayModeStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return isStandaloneDisplay({ displayModeStandalone, iosStandalone });
}

export function InstallPrompt() {
  const pathname = usePathname() || "/";
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const closedRef = useRef(false);
  const [mode, setMode] = useState<BannerMode>("hidden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!shouldOfferInstallOnPath(pathname)) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const dismissedAt = readInstallLaterAt(window.localStorage);
    const allowed = shouldShowInstallBanner({
      standalone: detectStandalone(),
      dismissedAt,
      now: Date.now(),
    });
    if (!allowed) return;

    const started = Date.now();
    let revealTimer = 0;
    let cancelled = false;

    const stash = () => {
      const saved = (window as Window & { __fitclubInstall?: BeforeInstallPromptEvent | null })
        .__fitclubInstall;
      if (saved) promptRef.current = saved;
    };

    const reveal = () => {
      if (closedRef.current) return;
      stash();
      const wait = Math.max(0, PWA_INSTALL_DELAY_MS - (Date.now() - started));
      window.clearTimeout(revealTimer);
      revealTimer = window.setTimeout(() => {
        if (cancelled || closedRef.current) return;
        stash();
        if (promptRef.current) {
          setMode("install");
          return;
        }
        const ios = isIosInstallGuide({
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints ?? 0,
        });
        setMode(ios ? "guide" : "hidden");
      }, wait);
    };

    const onPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as BeforeInstallPromptEvent;
      (window as Window & { __fitclubInstall?: BeforeInstallPromptEvent | null }).__fitclubInstall =
        promptRef.current;
      reveal();
    };

    const onInstalled = () => {
      promptRef.current = null;
      cancelled = true;
      setMode("hidden");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("fitclub-install-available", reveal);
    window.addEventListener("appinstalled", onInstalled);
    reveal();

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("fitclub-install-available", reveal);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [pathname]);

  function dismiss(remember: boolean) {
    closedRef.current = true;
    promptRef.current = null;
    (window as Window & { __fitclubInstall?: BeforeInstallPromptEvent | null }).__fitclubInstall =
      null;
    if (remember) {
      try {
        window.localStorage.setItem(PWA_INSTALL_LATER_KEY, String(Date.now()));
      } catch {
        /* private mode may block storage */
      }
    }
    setMode("hidden");
  }

  async function install() {
    const prompt = promptRef.current;
    if (!prompt) return;
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      promptRef.current = null;
      if (choice.outcome === "dismissed") dismiss(true);
      else dismiss(false);
    } catch {
      setMode("hidden");
    } finally {
      setBusy(false);
    }
  }

  if (!shouldOfferInstallOnPath(pathname) || mode === "hidden") return null;

  return (
    <aside className="install-banner" aria-label="نصب اپ فیت‌کلاب">
      <BrandLogo size="md" />
      <div className="install-banner-copy">
        <p className="install-banner-title">فیت‌کلاب را نصب کنید</p>
        {mode === "install" ? (
          <p className="install-banner-text">مثل یک اپ روی همین دستگاه باز می‌شود.</p>
        ) : (
          <p className="install-banner-text">
            از منوی اشتراک‌گذاری، «افزودن به صفحهٔ اصلی» را بزنید.
          </p>
        )}
        <div className="install-banner-actions">
          {mode === "install" ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void install()}
              disabled={busy}
            >
              نصب اپ
            </button>
          ) : null}
          <button className="btn btn-ghost" type="button" onClick={() => dismiss(true)}>
            بعداً
          </button>
        </div>
      </div>
    </aside>
  );
}
