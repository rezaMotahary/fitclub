"use client";

import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { ThemeToggle } from "./ThemeToggle";

export const STAFF_WRONG_DOOR_MESSAGE = "این در برای این حساب نیست.";

type StaffWrongDoorProps = {
  onLogout: () => void;
};

export function StaffWrongDoor({ onLogout }: StaffWrongDoorProps) {
  return (
    <main className="auth-shell">
      <ThemeToggle className="theme-toggle-float" />
      <div className="auth-card">
        <div className="auth-card-top">
          <BrandLogo size="md" wordmark />
        </div>
        <h1>این در برای این حساب نیست</h1>
        <p className="auth-lead">با این حساب نمی‌شود از اینجا وارد شد.</p>
        <div className="cta-row">
          <button type="button" className="btn btn-primary" onClick={onLogout}>
            خروج
          </button>
          <Link className="btn btn-ghost" href="/">
            سایت عمومی
          </Link>
        </div>
      </div>
    </main>
  );
}
