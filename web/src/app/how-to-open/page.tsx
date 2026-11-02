import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { showSampleHints, siteOrigin } from "@/lib/sample-hints";
import { tryBuildStaffPaths } from "@/lib/staff-paths";

export const metadata: Metadata = {
  title: "چطور باز کنم؟ | فیت‌کلاب",
};

export default function HowToOpenPage() {
  // Lists hidden staff links and sample passwords — local testing or demo server only.
  if (!showSampleHints()) notFound();

  const SITE_ORIGIN = siteOrigin();
  const staffPaths = tryBuildStaffPaths({
    STAFF_PATH_SECRETARY: process.env.STAFF_PATH_SECRETARY,
    STAFF_PATH_ADMIN: process.env.STAFF_PATH_ADMIN,
  });
  const secretaryHref = staffPaths?.secretary.home ?? null;
  const adminHref = staffPaths?.admin.home ?? null;

  return (
    <main className="auth-shell">
      <ThemeToggle className="theme-toggle-float" />
      <div className="auth-card howto-card">
        <BrandLogo size="md" wordmark />
        <h1>چطور پروژه را باز کنم؟</h1>
        <p className="auth-lead">
          نیازی به دستور فنی نیست. اگر صفحه باز نشد، در چت بگو «سایت را روشن کن»
          تا خودش روشن شود.
        </p>

        <ol className="howto-list">
          <li>
            این آدرس را در مرورگر باز کن:{" "}
            <a className="url-break" href={SITE_ORIGIN} dir="ltr">
              {SITE_ORIGIN}
            </a>
          </li>
          <li>برای ورود، از کارت همان نقش استفاده کن. دکمهٔ ورود کافی است.</li>
          <li>
            دکمهٔ <strong>روز / شب</strong> بالای صفحه را بزن تا تم عوض شود؛
            انتخابت برای دفعهٔ بعد یادت می‌ماند.
          </li>
        </ol>

        <div className="role-grid">
          <RoleCard
            title="پنل منشی"
            account="secretary@fitclub.local / FitClubSecretary1!"
            href={secretaryHref}
            url={secretaryHref ? `${SITE_ORIGIN}${secretaryHref}` : null}
            action="ورود منشی"
          />
          <RoleCard
            title="پنل ادمین"
            account="admin@fitclub.local / FitClubAdmin1!"
            href={adminHref}
            url={adminHref ? `${SITE_ORIGIN}${adminHref}` : null}
            action="ورود ادمین"
          />
          <section className="role-card">
            <h2>عضو</h2>
            <p>
              موبایل:{" "}
              <span className="ltr-isolate" dir="ltr">
                09121234567
              </span>
            </p>
            <p>
              کد یک‌بارمصرف:{" "}
              <span className="ltr-isolate" dir="ltr">
                123456
              </span>
            </p>
            <Link className="btn btn-primary" href="/login/member">
              ورود عضو
            </Link>
          </section>
        </div>

        <p className="auth-note">
          پرداخت پذیرش بعد از ورود منشی یا ادمین، از منوی همان پنل باز می‌شود.
        </p>
        <div className="cta-row">
          <Link className="btn btn-ghost" href="/">
            رفتن به سایت
          </Link>
        </div>
      </div>
    </main>
  );
}

function RoleCard({
  title,
  account,
  href,
  url,
  action,
}: {
  title: string;
  account: string;
  href: string | null;
  url: string | null;
  action: string;
}) {
  return (
    <section className="role-card">
      <h2>{title}</h2>
      <p>
        حساب:{" "}
        <span className="ltr-isolate" dir="ltr">
          {account}
        </span>
      </p>
      {url && href ? (
        <Link className="url-break" href={href} dir="ltr">
          {url}
        </Link>
      ) : (
        <p>لینک هنوز آماده نیست</p>
      )}
      {href ? (
        <Link className="btn btn-primary" href={href}>
          {action}
        </Link>
      ) : null}
    </section>
  );
}
