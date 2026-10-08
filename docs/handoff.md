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
| schema Prisma | ✅ نوشته شده + migrate اولیه (`init`) اعمال شد |
| PostgreSQL روی سیستم | ✅ نصب شد (17.11) — سرویس Running؛ `psql` ممکن است در PATH نباشد (مسیر کامل در `dev-environment.md`) |
| DB/user `fitsteel` + migrate + seed | ✅ دیتابیس/یوزر تأیید؛ migrate؛ seed پایه (پلن‌ها، منشی، مدیر، اعضای `FS-…`)؛ `/api/health` → `database: "up"` |
| سبک همکاری | ✅ `docs/collaboration.md` + rule وایب‌کودینگ |
| GitHub | `git@github.com:rezaMotahary/fitclub.git` — قانون sync در `docs/github-workflow.md` |
| تست | قانون الزامی در `docs/testing.md` — هر فیچر + گزارش بعد از تغییر مهم |
| داده نمونه | قانون در `docs/sample-data.md` |
| هویت | FitClub همه‌جا · RTL · شمسی · سه نقش — `docs/project-identity.md` |
| نسخه فعلی | `0.1.0` (اسکلت اولیه) |
| قوانین کسب‌وکار | کامل برای ساخت هسته: `docs/business-rules.md` |
| چت مدیر پروژه | فعال — پرامپت: `docs/prompts/project-manager-chat.md` · نقش: `docs/project-manager.md` |
| سؤال باز | فقط قیمت، ساعت، و تماس واقعی — `docs/open-questions.md` (مانع ساخت نیست) |
| واژه‌نامه / جریان / دسترسی / محدوده | هم‌تراز با قانون‌های قفل‌شده |
| فیچر واقعی (auth، حضور، مالی) | هنوز ساخته نشده؛ مرحلهٔ بعد: Auth پایه |

## سبک همکاری (الزامی)

مالک پروژه vibe coding می‌کند و تخصص فنی ندارد.
با مالک خیلی ساده و غیرفنی حرف بزن؛ پرامپت چت پیاده‌سازی می‌تواند تخصصی باشد. → `docs/collaboration.md`
جزئیات فنی را خودت حل کن؛ فقط تصمیم‌های کسب‌وکاری را بپرس.
هر توضیح مهم مالک را در `docs/` ثبت کن.
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
18. ورود و خروج فقط منشی. گزارش فقط درآمد پذیرش است
19. پیامک انقضا در ۱۴ روز مانده و صبح روز آخر است؛ بدهی ساعت ۹ صبح روز ۱۵
20. کد عضویت `FS-` است. «جلسه در ماه» فقط روی سایت است. یادداشت شیفت و پنل مربی در نسخهٔ اول نیست

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

## پیشنهاد ترتیب ساخت (اولویت PM)

منطق باشگاه برای ساخت هسته در `docs/business-rules.md` کامل است. قیمت، ساعت سانس، و اطلاعات تماس را سخت‌کد نکن؛ دادهٔ نمونه باشند و مدیر قیمت و ساعت را عوض کند. پرداخت آنلاین، ثبت‌نام سایت، مهمان، گزارش هزینه، یادداشت شیفت، و پنل مربی را نساز.

1. ~~اتصال DB~~ ✅ — یوزر/دیتابیس `fitsteel`، migrate، seed پایه، `/api/health` سبز
2. **الان → Auth پایه** — نقش‌های Member / Secretary / Admin + گارد Nest + ورود پرسنل (session) و اسکلت OTP عضو
3. **Members + Plans + Subscriptions** — هسته دامنه
4. **Attendance** — قوانین سقف هفتگی / انقضا / بدهی (منشی)
5. **فرانت پنل منشی** — اولویت عملیاتی اول (جستجو + ورود/خروج)
6. **فرانت سایت عمومی** — پورت از `prototype/index.html`
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

## اتصال DB (انجام‌شده ۲۰۲۶-۱۰-۰۸)

- یوزر و دیتابیس `fitsteel` آماده؛ `api/.env` با `DATABASE_URL` لوکال (commit نشود)
- برای `prisma migrate dev` یوزر `fitsteel` باید `CREATEDB` داشته باشد (سایهٔ Prisma)
- seed: `cd api` → `npx prisma db seed` (پلن‌های نمونهٔ پروتوتایپ، کاوه احمدی/مدیر، مریم صالحی/منشی، اعضای `FS-1042`…)
- health: `http://localhost:3001/api/health` → `database: "up"`

## ارجاعات مهم

- قانون باشگاه (منبع حقیقت): `docs/business-rules.md`
- سؤال‌های باز: `docs/open-questions.md`
- دامنه و نقش‌ها: `docs/product-overview.md`
- محیط توسعه: `docs/dev-environment.md`
- ADRها: `docs/adr/`
- UI مرجع: `prototype/*.html` + `prototype/styles.css`
- Connection string نمونه: `api/.env.example`
