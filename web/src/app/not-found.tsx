import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function NotFoundPage() {
  return (
    <main className="auth-shell">
      <ThemeToggle className="theme-toggle-float" />
      <div className="auth-card">
        <p className="brand-mark">FITCLUB</p>
        <h1>پیدا نشد</h1>
        <p className="auth-lead">این صفحه وجود ندارد.</p>
        <div className="cta-row">
          <Link className="btn btn-primary" href="/">
            بازگشت به سایت
          </Link>
        </div>
      </div>
    </main>
  );
}
