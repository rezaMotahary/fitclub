# Handoff — آماده‌سازی برای سشن ساخت اپ

آخرین به‌روزرسانی: 2026-10-08

پروژه: **فیت‌کلاب (FitClub)**

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
| تست | قانون الزامی در `docs/testing.md` — هر فیچر + گزارش بعد از تغییر مهم |
| داده نمونه | قانون در `docs/sample-data.md` |
| هویت | FitClub همه‌جا · RTL · شمسی · سه نقش — `docs/project-identity.md` |
| نسخه فعلی | `0.1.0` (اسکلت اولیه) |
| قوانین کسب‌وکار | دور ۱ تا ۵ در `docs/business-rules.md` |
| چت مدیر پروژه | پرامپت: `docs/prompts/project-manager-chat.md` · نقش: `docs/project-manager.md` |
| سؤال باز | `docs/open-questions.md` — زمان پیامک، چه کسی آرشیو می‌کند، کد عضویت، تماس |
| واژه‌نامه / جریان / دسترسی / محدوده | تا دور ۵ به‌روز است |
| فیچر واقعی (auth، حضور، مالی) | هستهٔ ورود و اشتراک را می‌شود ساخت. روز ارسال پیامک یادآوری هنوز باز است |

## سبک همکاری (الزامی)

مالک پروژه vibe coding می‌کند و دانش فنی عمیق ندارد.
جزئیات فنی را خودت حل کن؛ فقط تصمیم‌های کسب‌وکاری را بپرس.
هر توضیح مهم مالک را در `docs/` ثبت کن. → `docs/collaboration.md`
ابهام/حفره → بپرس (زیر ~۹۰٪ حدس نزن). → `docs/decision-policy.md`
صفحه خالی ممنوع؛ داده نمونه برای هر فیچر. → `docs/sample-data.md`
RTL + تاریخ شمسی + نقش‌های عضو/منشی/مدیر. → `docs/project-identity.md`

## تصمیم‌های قفل‌شده

1. فقط وب ریسپانسیو (بدون اپ native؛ PWA بعداً اختیاری)
2. یک باشگاه (فیت‌کلاب)، نه SaaS چندشعبه‌ای در MVP
3. فرانت: Next.js + TS + Tailwind — پورت `3000`
4. بک‌اند: NestJS + Prisma — پورت `3001`، prefix `/api`
5. دیتابیس: PostgreSQL
6. ورود عضو: OTP موبایل؛ پرسنل: Session + RBAC
7. ورود/خروج حضور: فقط دستی توسط منشی (بدون کارت‌خوان)
8. هفته شنبه تا جمعه؛ روز با خروج شمرده می‌شود؛ آخر سانس خودکار بسته می‌شود
9. بدهی فقط ماندهٔ شهریه است. با حداقل نصف، روز ۱ تا ۱۴ ورود باز است؛ از روز ۱۵ تا تسویه بسته است و روزهای دیرکرد می‌سوزد
10. اشتراک دقیقاً ۳۰ روز است و روز آخر تا پایان سانس ورود آزاد است
11. پلن هر روز سقف ۷ دارد؛ بیرون از سانس جنس خود عضو ورود ممنوع است
12. قیمت و ساعت پروتوتایپ نمونه است؛ منشی و مدیر هر دو اشتراک را فقط در پذیرش ثبت می‌کنند
13. حضور اشتباه تا پایان همان روز توسط منشی یا مدیر قابل ابطال است و رکورد باطل می‌ماند
14. تمدید زودتر از فردای پایان دوره شروع می‌شود؛ تمدید خودکار نیست و تخفیف را مدیر درصد می‌دهد
15. شروع اشتراک همان روز یا آینده است، نه گذشته. وسط دوره پلن عوض نمی‌شود و توقف موقت نیست
16. پرداخت آنلاین و ثبت‌نام از سایت در نسخهٔ اول نیست
17. بین دو دوره فاصله نمی‌افتد. عضو حذف نمی‌شود؛ آرشیو می‌شود و قابل برگشت است
18. ورود و خروج فقط منشی. پیامک شامل رمز، انقضا، و بدهی است. گزارش فقط درآمد پذیرش است

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

منطق ورود، شهریه، تمدید، و آرشیو در `docs/business-rules.md` قفل است. ساعت و قیمت را سخت‌کد نکن. پرداخت آنلاین، ثبت‌نام سایت، مهمان، و گزارش هزینه را نساز. روز ارسال پیامک یادآوری هنوز باز است.

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

- قانون باشگاه (منبع حقیقت): `docs/business-rules.md`
- سؤال‌های باز: `docs/open-questions.md`
- دامنه و نقش‌ها: `docs/product-overview.md`
- محیط توسعه: `docs/dev-environment.md`
- ADRها: `docs/adr/`
- UI مرجع: `prototype/*.html` + `prototype/styles.css`
- Connection string نمونه: `api/.env.example`
