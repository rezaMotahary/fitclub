import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "چطور باز کنم؟ | فیت‌کلاب",
};

export default function HowToOpenPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card" style={{ width: "min(560px, 100%)" }}>
        <p className="brand-mark">FITCLUB</p>
        <h1>چطور پروژه را باز کنم؟</h1>
        <p className="auth-lead">
          لازم نیست ترمینال یا دستور فنی بزنی. اگر صفحه باز نشد، در چت پروژه بگو
          «سایت را روشن کن» تا عامل خودش انجام دهد.
        </p>

        <ol className="howto-list">
          <li>
            این آدرس را در مرورگر باز کن:{" "}
            <a href="http://localhost:3000">
              <code>http://localhost:3000</code>
            </a>
          </li>
          <li>برای ورود، از حساب‌های نمونه زیر استفاده کن.</li>
        </ol>

        <div className="sample-box">
          <p>
            <strong>منشی:</strong> secretary@fitclub.local / FitClubSecretary1!
          </p>
          <p>
            <strong>مدیر:</strong> admin@fitclub.local / FitClubAdmin1!
          </p>
          <p>
            <strong>عضو:</strong> موبایل ۰۹۱۲۱۲۳۴۵۶۷ — کد: ۱۲۳۴۵۶
          </p>
        </div>

        <div className="cta-row auth-links">
          <Link className="btn btn-primary" href="/">
            رفتن به سایت
          </Link>
          <Link className="btn btn-ghost" href="/login/member">
            ورود عضو
          </Link>
          <Link className="btn btn-ghost" href="/login/staff">
            ورود پرسنل
          </Link>
        </div>
      </div>
    </main>
  );
}
