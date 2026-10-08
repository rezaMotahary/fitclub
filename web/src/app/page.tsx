import Link from "next/link";

const links = [
  { href: "/member", label: "پنل اعضا" },
  { href: "/secretary", label: "پنل منشی" },
  { href: "/admin", label: "پنل مدیریت" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <div className="space-y-4">
        <p className="font-[family-name:var(--font-display)] text-sm tracking-[0.2em] text-accent">
          FITCLUB
        </p>
        <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
          اسکلت اولیه وب آماده است
        </h1>
        <p className="max-w-2xl text-muted">
          این صفحه فقط نقطه شروع Next.js برای فیت‌کلاب است. در سشن بعد UI را از
          پروتوتایپ Cyan Night به اینجا منتقل می‌کنیم و به API متصل می‌شویم.
        </p>
      </div>

      <nav className="flex flex-wrap gap-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md border border-line bg-panel px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted">
        API هدف:{" "}
        <code className="rounded bg-panel px-1.5 py-0.5 text-accent">
          {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"}
        </code>
      </p>
    </main>
  );
}
