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
        <p className="auth-lead">دو پنجره ترمینال کافی است.</p>

        <ol className="howto-list">
          <li>
            در پوشه <code>api</code> بزنید: <code>npm run start:dev</code>
          </li>
          <li>
            در پوشه <code>web</code> بزنید: <code>npm run dev</code>
          </li>
          <li>
            مرورگر را باز کنید:{" "}
            <a href="http://localhost:3000">
              <code>http://localhost:3000</code>
            </a>
          </li>
        </ol>

        <div className="sample-box">
          <p>
            <strong>منشی:</strong> secretary@fitclub.local / FitClubSecretary1!
          </p>
          <p>
            <strong>مدیر:</strong> admin@fitclub.local / FitClubAdmin1!
          </p>
          <p>
            <strong>عضو:</strong> موبایل ۰۹۱۲۱۲۳۴۵۶۷ — کد OTP: ۱۲۳۴۵۶
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
