# Handoff — آماده‌سازی برای سشن ساخت اپ

آخرین به‌روزرسانی: 2026-10-08

این فایل «حافظهٔ اولیه» برای چت/سشن بعدی است. از اینجا ادامه بده.

---

## وضعیت فعلی

| مورد | وضعیت |
|------|--------|
| پروتوتایپ UI | آماده در `prototype/` (Cyan Night) |
| مستندات دامنه | `docs/product-overview.md` |
| ADR استک | Accepted — `docs/adr/0003-technology-stack.md` |
| اسکلت `web/` (Next.js) | ✅ آماده — RTL، مسیرهای `/` `/member` `/secretary` `/admin` |
| اسکلت `api/` (NestJS + Prisma) | ✅ آماده — ماژول‌ها، health، schema دامنه |
| schema Prisma | ✅ نوشته شده — هنوز migrate نزده (بعد از ثبت توضیحات کسب‌وکار) |
| PostgreSQL روی سیستم | ✅ نصب شد (17.11) — DB/user `fitsteel` آماده |
| سبک همکاری | ✅ `docs/collaboration.md` + rule وایب‌کودینگ |
| GitHub | `git@github.com:rezaMotahary/fitclub.git` — قانون sync در `docs/github-workflow.md` |
| نسخه فعلی | `0.1.0` (اسکلت اولیه) |
| فیچر واقعی (auth، حضور، مالی) | هنوز شروع نشده — بعد از توضیحات مالک |

## سبک همکاری (الزامی)

مالک پروژه vibe coding می‌کند و دانش فنی عمیق ندارد.
جزئیات فنی را خودت حل کن؛ فقط تصمیم‌های کسب‌وکاری را بپرس.
هر توضیح مهم مالک را در `docs/` ثبت کن. → `docs/collaboration.md`

## تصمیم‌های قفل‌شده

1. فقط وب ریسپانسیو (بدون اپ native؛ PWA بعداً اختیاری)
2. یک باشگاه (فیت‌استیل)، نه SaaS چندشعبه‌ای در MVP
3. فرانت: Next.js + TS + Tailwind — پورت `3000`
4. بک‌اند: NestJS + Prisma — پورت `3001`، prefix `/api`
5. دیتابیس: PostgreSQL
6. ورود عضو: OTP موبایل؛ پرسنل: Session + RBAC
7. ورود/خروج حضور: فقط دستی توسط منشی (بدون کارت‌خوان)

## ساختار پوشه‌ها

```text
fitclub/
├── docs/
├── prototype/
├── web/          # localhost:3000
│   └── src/app/  # page, member, secretary, admin
└── api/          # localhost:3001/api
    ├── prisma/schema.prisma
    └── src/
        ├── auth/ attendance/ members/ plans/
        ├── subscriptions/ payments/ health/ prisma/
        └── main.ts
```

## پیشنهاد ترتیب ساخت در سشن بعد

1. **اتصال DB** — تأیید `psql`، ساخت یوزر/دیتابیس `fitsteel`، تنظیم `api/.env`، سپس:
   ```powershell
   cd api
   npx prisma migrate dev --name init
   ```
2. **Auth پایه** — نقش‌ها + گارد Nest
3. **Members + Plans + Subscriptions** — هسته دامنه
4. **Attendance** — قوانین سقف هفتگی / انقضا / بدهی (منشی)
5. **فرانت سایت عمومی** — پورت از `prototype/index.html`
6. **فرانت پنل منشی** — اولویت عملیاتی اول
7. **فرانت پنل عضو و ادمین**
8. **Payments** — ثبت دستی پرداخت پذیرش در MVP

## دستورهای روزمره

```powershell
# API
cd D:\vibe-coding\fitclub\api
npm run start:dev
# health: http://localhost:3001/api/health

# Web
cd D:\vibe-coding\fitclub\web
npm run dev
# http://localhost:3000
```

## وقتی کاربر گفت Postgres نصب شد

1. `psql --version` و سرویس Running را چک کن
2. دیتابیس/یوزر `fitsteel` را بساز (اگر نبود) — دستورها در `docs/dev-environment.md`
3. `api/.env` را با `DATABASE_URL` واقعی تأیید کن
4. `npx prisma migrate dev --name init` بزن
5. `npm run start:dev` و `/api/health` → `database: "up"`
6. ساخت فیچرها را از Auth / Members شروع کن

## ارجاعات مهم

- دامنه و نقش‌ها: `docs/product-overview.md`
- محیط توسعه: `docs/dev-environment.md`
- ADRها: `docs/adr/`
- UI مرجع: `prototype/*.html` + `prototype/styles.css`
- Connection string نمونه: `api/.env.example`
