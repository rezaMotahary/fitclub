import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "چطور باز کنم؟ | فیت‌کلاب",
};

export default function HowToOpenPage() {
  return (
    <main className="auth-shell">
      <ThemeToggle className="theme-toggle-float" />
      <div className="auth-card" style={{ width: "min(560px, 100%)" }}>
        <p className="brand-mark">FITCLUB</p>
        <h1>چطور پروژه را باز کنم؟</h1>
        <p className="auth-lead">
          نیازی به دستور فنی نیست. اگر صفحه باز نشد، در چت بگو «سایت را روشن کن»
          تا خودش روشن شود.
        </p>

        <ol className="howto-list">
          <li>
            این آدرس را در مرورگر باز کن:{" "}
            <a href="http://localhost:3000">
              <code className="ltr-isolate" dir="ltr">
                http://localhost:3000
              </code>
            </a>
          </li>
          <li>برای ورود، از حساب‌های نمونه زیر استفاده کن.</li>
          <li>
            دکمهٔ <strong>روز / شب</strong> بالای صفحه را بزن تا تم عوض شود؛
            انتخابت برای دفعهٔ بعد یادت می‌ماند.
          </li>
        </ol>

        <div className="sample-box">
          <p>
            <strong>منشی:</strong>{" "}
            <span className="ltr-isolate" dir="ltr">
              secretary@fitclub.local / FitClubSecretary1!
            </span>
          </p>
          <p>
            <strong>مدیر:</strong>{" "}
            <span className="ltr-isolate" dir="ltr">
              admin@fitclub.local / FitClubAdmin1!
            </span>
          </p>
          <p>
            <strong>عضو:</strong>{" "}
            <span className="ltr-isolate" dir="ltr">
              09121234567
            </span>{" "}
            (کد یک‌بارمصرف:{" "}
            <span className="ltr-isolate" dir="ltr">
              123456
            </span>
            )
          </p>
          <p>
            <strong>پرداخت پذیرش:</strong> بعد از ورود از لینک اختصاصی منشی یا
            مدیر، از منوی همان پنل باز می‌شود — عضو بدهکار نمونه:{" "}
            <span className="ltr-isolate" dir="ltr">
              FS-1046
            </span>
          </p>
        </div>

        <div className="cta-row auth-links">
          <Link className="btn btn-primary" href="/">
            رفتن به سایت
          </Link>
          <Link className="btn btn-ghost" href="/login/member">
            ورود عضو
          </Link>
        </div>
      </div>
    </main>
  );
}
