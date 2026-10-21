# Handoff — آماده‌سازی برای سشن ساخت اپ

آخرین به‌روزرسانی: 2026-10-21

پروژه: **فیت‌کلاب (FitClub)**

این فایل «حافظهٔ اولیه» برای چت/سشن بعدی است. از اینجا ادامه بده.

---

## وضعیت فعلی

| مورد | وضعیت |
|------|--------|
| پروتوتایپ UI | آماده در `prototype/` (Cyan Night) |
| مستندات دامنه | `docs/product-overview.md` |
| ADR استک | Accepted — `docs/adr/0003-technology-stack.md` |
| اسکلت `web/` (Next.js) | ✅ آماده — RTL؛ سایت عمومی + ورودها + پنل عضو (داشبورد) / منشی (حضور) / مدیر (نمای کلی + اعضا/پلن) |
| اسکلت `api/` (NestJS + Prisma) | ✅ آماده — ماژول‌ها، health، schema دامنه |
| schema Prisma | ✅ هم‌تراز DB (Session / OtpChallenge / isArchived / …) |
| PostgreSQL روی سیستم | ✅ نصب شد (17.11) — سرویس Running؛ `psql` ممکن است در PATH نباشد (مسیر کامل در `dev-environment.md`) |
| DB/user `fitsteel` + migrate + seed | ✅ دیتابیس/یوزر تأیید؛ migrate؛ seed با رمز نمونهٔ پرسنل + عضو OTP و عضو آرشیو |
| Auth پایه | ✅ پرسنل: شناسه+رمز + cookie httpOnly؛ عضو: اسکلت OTP (بدون SMS واقعی؛ `OTP_DEV_CODE`)؛ RBAC؛ آرشیو → ورود پنل ممنوع |
| Members + Plans + Subscriptions | ✅ تأیید مالک ۱۴۰۴/۰۷/۲۳ — API + پنل ساده منشی/مدیر (لیست اعضا/پلن؛ آرشیو؛ فروش/تمدید) |
| Attendance (حضور) | ✅ تأیید QA ۱۴۰۴/۰۷/۲۳ — ورود/خروج/رد با دلیل/ابطال/نقش مدیر |
| سبک همکاری | ✅ `docs/collaboration.md` + rule وایب‌کودینگ |
| GitHub | `git@github.com:rezaMotahary/fitclub.git` — قانون sync در `docs/github-workflow.md` |
| تست | قانون الزامی در `docs/testing.md` — هر فیچر + گزارش بعد از تغییر مهم |
| داده نمونه | قانون در `docs/sample-data.md` · رمزها در `docs/.env.example` |
| هویت | FitClub همه‌جا · RTL · شمسی · سه نقش — `docs/project-identity.md` |
| تصاویر / لوگو | اختیار کامل جنریت برای عامل — `docs/visual-assets.md` |
| PWA | هدف تأییدشده؛ هنوز پیاده نشده — یادآوری در مرحله مناسب — `docs/pwa.md` |
| نسخه فعلی | `0.8.0` (پرداخت دستی پذیرش) |
| قوانین کسب‌وکار | کامل برای ساخت هسته: `docs/business-rules.md` |
| چت مدیر پروژه | فعال — پرامپت: `docs/prompts/project-manager-chat.md` · نقش: `docs/project-manager.md` |
| چت QA | الزامی از ۱۴۰۴/۰۷/۲۳ — پرامپت: `docs/prompts/qa-chat.md` · نقش: `docs/qa.md`؛ فقط بعد از تأیید QA به PM برای مرحله بعد برگرد |
| سؤال باز | فقط قیمت، ساعت، و تماس واقعی — `docs/open-questions.md` (مانع ساخت نیست) |
| واژه‌نامه / جریان / دسترسی / محدوده | هم‌تراز با قانون‌های قفل‌شده |
| صفحهٔ قابل‌دیدن در مرورگر | ✅ سایت عمومی + ورود + پنل منشی (حضور) / مدیر — `http://localhost:3000` · راهنما: `/how-to-open` |
| قانون «بدون ترمینال برای مالک» | ✅ ثبت شد ۱۴۰۴/۰۷/۲۲ — عامل روشن می‌کند؛ مالک فقط لینک باز می‌کند |
| تم روشن / تاریک | ✅ تأیید مالک ۱۴۰۴/۰۷/۲۳ — روز/شب همه‌جا؛ یادآوری انتخاب؛ هیرو روشن — `docs/theme.md` |
| داشبورد عضو و مدیر | ✅ تأیید QA ۱۴۰۴/۰۷/۲۹ |
| Payments (پرداخت دستی پذیرش) | ✅ تأیید QA ۱۴۰۴/۰۷/۲۹ (KI-004/005/006 بسته) |
| باگ باز | KI-007 — پلن تمدید به پلن فعلی برمی‌گردد — `docs/known-issues.md` |
| جریان تحویل | PM → برنامه‌نویس → **QA** → فقط با جملهٔ «QA تأیید کرد: …» برگرد به PM |
| بازخورد پنل‌ها | مدیر خیلی ساده؛ منشی ناقص؛ ظاهر پنل‌ها تأیید نیست (دسکتاپ/زیبایی) — `docs/product-roadmap.md` · `docs/ui-ux-panels.md` |
| فیچر واقعی بعدی | **پنل مدیر v2** → تکمیل منشی → **بازنگری UI/UX پنل‌ها** |

## سبک همکاری (الزامی)

مالک پروژه vibe coding می‌کند و تخصص فنی ندارد.
با مالک خیلی ساده و غیرفنی حرف بزن؛ پرامپت چت پیاده‌سازی می‌تواند تخصصی باشد. → `docs/collaboration.md`
**مالک ترمینال نمی‌زند.** روشن کردن سایت/API و هر دستور فنی با عامل است؛ به مالک فقط لینک و حساب نمونه بده.
**بعد از هر فیچر → چت QA**؛ به PM فقط با «QA تأیید کرد: …» برگرد. → `docs/qa.md`
جزئیات فنی را خودت حل کن؛ فقط تصمیم‌های کسب‌وکاری را بپرس.
هر توضیح مهم مالک را در `docs/` ثبت کن.
ابهام/حفره → بپرس (زیر ~۹۰٪ حدس نزن). → `docs/decision-policy.md`
صفحه خالی ممنوع؛ داده نمونه برای هر فیچر. → `docs/sample-data.md`
RTL + تاریخ شمسی + نقش‌های عضو/منشی/مدیر. → `docs/project-identity.md`
رقم فارسی و انگلیسی برای هر ورودی عددی — تست و QA هر دو را چک کنند. → `docs/testing.md` · `docs/qa.md`

## تصمیم‌های قفل‌شده

1. فقط وب ریسپانسیو (بدون اپ native). **PWA هدف محصول است** — وقتی مرحله مناسب رسید یادآوری + پیاده + تست (`docs/pwa.md` · ADR-0004)
1b. تصاویر/لوگو: عامل اختیار کامل جنریت دارد (`docs/visual-assets.md`)
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
2. ~~Auth پایه~~ ✅ — نقش‌ها + گارد RBAC + ورود پرسنل (cookie httpOnly) + اسکلت OTP عضو (`OTP_DEV_CODE` / لاگ؛ بدون SMS واقعی) — تأیید مالک ۱۴۰۴/۰۷/۲۲
3. ~~قابل دیدن در مرورگر~~ ✅ — سایت عمومی از پروتوتایپ + `/login/staff` + `/login/member` + خوش‌آمد `/member` `/secretary` `/admin` — ۱۴۰۴/۰۷/۲۲
4. ~~Members + Plans + Subscriptions~~ ✅ — API + پنل ساده منشی/مدیر — تأیید مالک ۱۴۰۴/۰۷/۲۳
5. ~~تم روشن و تاریک~~ ✅ — تأیید مالک؛ در صورت فرصت QA جدا روی تم هم خوب است — `docs/theme.md`
6. ~~فیکس KI-001 موبایل~~ ✅ — تأیید QA ۱۴۰۴/۰۷/۲۳ (رقم فارسی + انگلیسی) — `docs/known-issues.md`
7. ~~Attendance~~ ✅ — تأیید QA ۱۴۰۴/۰۷/۲۳ — ورود/خروج/رد با دلیل/ابطال/نقش مدیر
8. ~~فیکس KI-002 تاریخ شمسی~~ ✅ — تأیید QA ۱۴۰۴/۰۷/۲۹ — `web/src/lib/jalali-date.ts`
9. ~~داشبورد عضو و مدیر~~ ✅ — تأیید QA ۱۴۰۴/۰۷/۲۹ — `GET /api/dashboard/me` · `GET /api/dashboard/admin` · `/member` · `/admin`
10. ~~Payments~~ ✅ پیاده — منتظر QA — `POST/GET /api/payments` · `/secretary/payments` · `/admin/payments` · عضو فقط مشاهده در `/member`
11. **بعد از QA → پنل مدیر v2** — داشبورد مدیریتی جذاب با دیتا/چارت/فیلتر + تغییر قیمت پلن (+ درصد تخفیف تمدید) — `docs/product-roadmap.md` → سپس QA
12. **تکمیل پنل منشی** — تجربهٔ پذیرش جامع‌تر — سپس QA
13. **بازنگری UI/UX پنل‌ها** — دسکتاپ + زیباتر — `docs/ui-ux-panels.md` → سپس QA
14. **بازبینی متن‌های فارسی UI** — قبل از تحویل نهایی — `docs/copy-review.md` → سپس QA
15. **PWA** — وقتی هسته و ظاهر پنل پایدارتر شد — `docs/pwa.md`

«آفر» در این نسخه = فقط تغییر قیمت پلن توسط مدیر (نه کد تخفیف). کد تخفیف = آینده.

### یادداشت اولویت (بازخورد مالک ۱۴۰۴/۰۷/۲۹)

نسخهٔ فعلی داشبورد مدیر عمداً اسکلت اولیه بود؛ مالک آن را کافی نمی‌داند. ظاهر پنل‌ها هم تأیید نیست. این‌ها در صف رسمی است، نه فراموشی.

### دروازهٔ QA (از ۱۴۰۴/۰۷/۲۳)

ساخت Alone کافی نیست. مسیر: ساخت → QA → تأیید → برگشت به PM. پرامپت QA: `docs/prompts/qa-chat.md`

## برای مالک (بدون ترمینال)

- آدرس سایت: **http://localhost:3000**
- پرداخت پذیرش: **http://localhost:3000/secretary/payments** یا **/admin/payments**
- اگر باز نشد بگو «سایت را روشن کن» — عامل خودش API و وب را روشن می‌کند
- حساب نمونه: منشی `secretary@fitclub.local` / `FitClubSecretary1!` · مدیر `admin@fitclub.local` / `FitClubAdmin1!` · عضو موبایل `09121234567` کد `123456`

## دستورهای روزمره (فقط برای عامل — نه مالک)

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

## Auth پایه (انجام‌شده ۲۰۲۶-۱۰-۱۴)

- پرسنل: `POST /api/auth/staff/login` + cookie httpOnly
- عضو: `POST /api/auth/member/otp/request` و `.../verify`؛ توسعه با `OTP_DEV_CODE` (پیش‌فرض `123456`)
- `GET /api/auth/me` · `POST /api/auth/logout` · RBAC
- حساب‌های نمونه: `docs/sample-data.md` و `docs/.env.example`

## سایت عمومی + ورود وب (انجام‌شده ۲۰۲۶-۱۰-۱۴)

- `/` — سایت عمومی Cyan Night با برند فیت‌کلاب (قیمت/ساعت/تماس نمونه)
- `/login/staff` — ورود منشی/مدیر → API + cookie
- `/login/member` — موبایل + OTP (کد توسعه `123456`)
- `/member` — داشبورد عضو: پلن، مانده اشتراک، سهم هفته، تقویم شنبه–جمعه، اعلان انقضا، حضور و پرداخت
- `/secretary` — حضور منشی: جستجو، وضعیت، ورود/خروج، تایمر، لاگ امروز، ابطال
- `/admin` — نمای کلی (فعال/حضور امروز/نزدیک انقضا/درآمد پذیرش ماه) + پلن‌ها + اعضا + آرشیو
- راهنمای کوتاه: `/how-to-open` و بخش زیر

## Members + Plans + Subscriptions (انجام‌شده ۲۰۲۶-۱۰-۱۴)

- `GET /api/plans` · `PATCH /api/plans/:id` (فقط مدیر برای تعرفه)
- `GET /api/members?q=` · `GET /api/members/:id` · `POST /api/members` · آرشیو/فعال‌سازی
- `POST /api/subscriptions/sell` · `POST /api/subscriptions/renew` — قوانین نصف شهریه، شروع امروز/فردا، تمدید بدون فاصله، تخفیف تمدید زودتر از تنظیمات مدیر
- منطق خالص: `api/src/common/iran-date.ts` · `subscription-pricing.ts` · `subscription-period.ts`
- تست واحد + e2e: `npm test` و `npm run test:e2e` داخل `api/`

## Attendance (انجام‌شده ۲۰۲۶-۱۰-۱۵)

- `GET /api/attendance/eligibility/:memberId` · `GET /api/attendance/today` · `GET /api/attendance/inside`
- `POST /api/attendance/check-in` · `POST /api/attendance/check-out` — فقط منشی
- `POST /api/attendance/:id/void` — منشی و مدیر تا پایان همان روز ایران
- `POST /api/attendance/auto-close` — خروج با **ساعت پایان سانس** (نه ساعت دیرکرد سیستم)
- منطق خالص: `attendance-eligibility.ts` · `attendance-week.ts` · `session-schedule.ts`
- پنل: `http://localhost:3000/secretary`
- seed: سقف پر، بدهی روز ۱۶، حضور بسته‌شدهٔ سازگار (سارا)، باطل‌شده، بستن خودکار — `docs/sample-data.md`

## داشبورد عضو و مدیر (انجام‌شده ۲۰۲۶-۱۰-۲۱) — تأیید QA ۱۴۰۴/۰۷/۲۹

- `GET /api/dashboard/me` — فقط نقش عضو؛ پلن، مانده روز، سهم/سقف هفته، تقویم شنبه–جمعه، اعلان انقضا (≤۱۴ روز، بدون تمدید خودکار)، حضور اخیر، پرداخت‌ها
- `GET /api/dashboard/admin` — فقط مدیر؛ اعضای فعال، حضور امروز، نزدیک انقضا، درآمد پذیرش ماه شمسی
- وب: `/member` · نمای کلی در `/admin`
- منطق اعلان: `api/src/common/dashboard-notices.ts`

## Payments — پرداخت دستی پذیرش (انجام‌شده ۲۰۲۶-۱۰-۲۱) — منتظر QA

- `POST /api/payments` — منشی/مدیر: قسط یا تسویه روی اشتراک جاری با بدهی (نقد / کارت‌خوان / کارت‌به‌کارت)
- `GET /api/payments?memberId=&q=&method=` — لیست/فیلتر پذیرش
- `GET /api/payments/me` — فقط عضو؛ سوابق خودش
- قانون: کمتر از نصف برای شروع ممنوع؛ قسط بعدی تا سقف مانده آزاد؛ تسویه کامل → ورود از نظر شهریه باز
- وب: **http://localhost:3000/secretary/payments** · **http://localhost:3000/admin/payments**
- عضو فقط مشاهده در `/member` (بدون پرداخت از پنل)
- درآمد پذیرش داشبورد مدیر از همان `Payment`های تأییدشده پر می‌شود
- بدهکار نمونه: `FS-1045` (روز~۱۰) · `FS-1046` (روز~۱۶)

## برای مالک (بدون ترمینال)

- آدرس: **http://localhost:3000** — اگر باز نشد بگو «سایت را روشن کن»
- پرداخت پذیرش: **/secretary/payments** یا **/admin/payments**
- منشی: `secretary@fitclub.local` / `FitClubSecretary1!`
- مدیر: `admin@fitclub.local` / `FitClubAdmin1!`
- عضو: موبایل `09121234567` + کد `123456`

## ارجاعات مهم

- قانون باشگاه (منبع حقیقت): `docs/business-rules.md`
- سؤال‌های باز: `docs/open-questions.md`
- دامنه و نقش‌ها: `docs/product-overview.md`
- محیط توسعه: `docs/dev-environment.md`
- ADRها: `docs/adr/`
- UI مرجع: `prototype/*.html` + `prototype/styles.css`
- Connection string نمونه: `api/.env.example`
