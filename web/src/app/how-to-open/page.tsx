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
      <div className="auth-card" style={{ width: "min(560px, 100%)" }}>
        <BrandLogo size="md" wordmark />
        <h1>چطور پروژه را باز کنم؟</h1>
        <p className="auth-lead">
          نیازی به دستور فنی نیست. اگر صفحه باز نشد، در چت بگو «سایت را روشن کن»
          تا خودش روشن شود.
        </p>

        <ol className="howto-list">
          <li>
            این آدرس را در مرورگر باز کن:{" "}
            <a href={SITE_ORIGIN}>
              <code className="ltr-isolate" dir="ltr">
                {SITE_ORIGIN}
              </code>
            </a>
          </li>
          <li>برای ورود، از حساب‌های نمونه و لینک‌های زیر استفاده کن.</li>
          <li>
            دکمهٔ <strong>روز / شب</strong> بالای صفحه را بزن تا تم عوض شود؛
            انتخابت برای دفعهٔ بعد یادت می‌ماند.
          </li>
        </ol>

        <div className="sample-box">
          <p>
            <strong>پنل منشی:</strong>{" "}
            {secretaryHref ? (
              <Link href={secretaryHref} className="ltr-isolate" dir="ltr">
                {`${SITE_ORIGIN}${secretaryHref}`}
              </Link>
            ) : (
              "لینک هنوز آماده نیست"
            )}
          </p>
          <p>
            حساب منشی:{" "}
            <span className="ltr-isolate" dir="ltr">
              secretary@fitclub.local / FitClubSecretary1!
            </span>
          </p>
          <p>
            <strong>پنل ادمین:</strong>{" "}
            {adminHref ? (
              <Link href={adminHref} className="ltr-isolate" dir="ltr">
                {`${SITE_ORIGIN}${adminHref}`}
              </Link>
            ) : (
              "لینک هنوز آماده نیست"
            )}
          </p>
          <p>
            حساب ادمین:{" "}
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
            <strong>پرداخت پذیرش:</strong> بعد از ورود منشی یا ادمین، از منوی
            همان پنل باز می‌شود — عضو بدهکار نمونه:{" "}
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
          {secretaryHref ? (
            <Link className="btn btn-ghost" href={secretaryHref}>
              ورود منشی
            </Link>
          ) : null}
          {adminHref ? (
            <Link className="btn btn-ghost" href={adminHref}>
              ورود ادمین
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
