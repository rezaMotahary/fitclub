"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";

export type PanelNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

type PanelFrameProps = {
  title: string;
  lede?: ReactNode;
  nav: PanelNavItem[];
  onLogout: () => void;
  children: ReactNode;
};

function navIsCurrent(pathname: string, item: PanelNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function PanelFrame({
  title,
  lede,
  nav,
  onLogout,
  children,
}: PanelFrameProps) {
  const pathname = usePathname();
  const homeHref = nav[0]?.href ?? "/";

  return (
    <div className="panel-app">
      <aside className="panel-side">
        <Link href={homeHref} className="panel-brand">
          <BrandLogo size="sm" wordmark decorative />
          <span className="panel-brand-name">فیت‌کلاب</span>
        </Link>
        <nav className="panel-nav" aria-label="منوی پنل">
          {nav.map((item) => {
            const current = navIsCurrent(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={current ? "is-active" : undefined}
                aria-current={current ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="panel-side-foot">
          <ThemeToggle />
          <button type="button" className="btn btn-ghost" onClick={onLogout}>
            خروج
          </button>
          <Link className="btn btn-ghost" href="/">
            سایت
          </Link>
        </div>
      </aside>
      <main className="panel-main">
        <header className="panel-head">
          <div>
            <h1>{title}</h1>
            {lede ? <div className="panel-lede">{lede}</div> : null}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
