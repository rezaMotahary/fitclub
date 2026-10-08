import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "فیت‌استیل | FitSteel",
  description: "باشگاه بدنسازی فیت‌استیل — سعادت‌آباد",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
