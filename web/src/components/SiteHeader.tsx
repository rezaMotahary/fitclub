"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  active?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "صفحه اصلی", active: true },
  { href: "/#amenities", label: "امکانات" },
  { href: "/#schedule", label: "سانس‌ها" },
  { href: "/#pricing", label: "اشتراک" },
  { href: "/#contact", label: "تماس" },
  { href: "/login/member", label: "ورود اعضا" },
  { href: "/login/staff", label: "ورود پرسنل" },
  { href: "/member", label: "پنل اعضا" },
  { href: "/secretary", label: "پنل منشی" },
  { href: "/admin", label: "پنل مدیریت" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="topbar">
      <div className="topbar-main">
        <Link className="brand" href="/" onClick={closeMenu}>
          FIT<span>CLUB</span>
        </Link>
        <button
          className={`menu-toggle${open ? " is-open" : ""}`}
          type="button"
          aria-label="منو"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
        </button>
      </div>
      <nav className={`nav${open ? " open" : ""}`} id="mainNav">
        {navItems.map((item) => (
          <Link
            key={item.href + item.label}
            className={item.active ? "active" : undefined}
            href={item.href}
            onClick={closeMenu}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
