import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "آفلاین هستید | فیت‌کلاب",
};

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="offline-tools">
        <ThemeToggle />
      </div>
      <BrandLogo size="lg" />
      <h1>آفلاین هستید</h1>
      <p>اتصال اینترنت قطع است. وقتی وصل شد، دوباره تلاش کنید.</p>
      <a className="btn btn-primary" href="/">
        تلاش دوباره
      </a>
    </main>
  );
}
