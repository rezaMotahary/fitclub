import type { Metadata } from "next";
import { Suspense } from "react";
import { InstallPrompt } from "@/components/InstallPrompt";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PWA_INSTALL_BOOTSTRAP_SCRIPT } from "@/lib/pwa-install";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "فیت‌کلاب",
  title: "فیت‌کلاب | FitClub",
  description: "فیت‌کلاب — مدیریت باشگاه بدنسازی",
  appleWebApp: {
    capable: true,
    title: "فیت‌کلاب",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/brand/favicon.ico" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/brand/pwa/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: PWA_INSTALL_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          {children}
          <Suspense fallback={null}>
            <InstallPrompt />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
