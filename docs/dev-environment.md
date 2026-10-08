# محیط توسعه — وضعیت نصب و راهنما

تاریخ بررسی: 2026-10-08

## خلاصه وضعیت روی این سیستم

| ابزار | نیاز برای استک | وضعیت | نسخه / توضیح |
|-------|----------------|--------|---------------|
| Node.js | بله | نصب است | `v26.5.0` |
| npm | بله | نصب است | `11.17.0` |
| npx | بله | نصب است | همراه npm |
| Git | بله | نصب است | `2.55.0.windows.5` |
| NestJS CLI | توصیه می‌شود | نصب شد | `@nestjs/cli` → `12.0.8` |
| TypeScript (global) | اختیاری | نصب شد | `7.0.2` |
| ts-node (global) | اختیاری | نصب شد | همراه Nest tooling |
| PostgreSQL | بله | **نصب است** | `17.11` — سرویس `postgresql-x64-17` Running |
| psql (CLI) | بله | نصب است؛ ممکن است در PATH نباشد | مسیر کامل: `C:\Program Files\PostgreSQL\17\bin\psql.exe` |
| pgAdmin | اختیاری | همراه نصب‌کننده | در صورت نیاز از منوی Start |
| Docker | اختیاری | نصب نیست | برای این پروژه فعلاً لازم نیست |
| Prisma CLI | پروژه‌ای | نیاز به global ندارد | با `npx prisma` داخل پروژه API |
| Next.js | پروژه‌ای | نیاز به global ندارد | با `npx create-next-app` ساخته می‌شود |
| pnpm / yarn | اختیاری | نصب نیست | با **npm** کار می‌کنیم |

### نکته درباره Node 26

نسخهٔ فعلی Node خیلی جدید است. اگر هنگام ساخت Next/Nest خطای عجیب دیدی، Node LTS (مثلاً 22) را از [nodejs.org](https://nodejs.org/) نصب کن. فعلاً با 26 ادامه می‌دهیم مگر مشکل پیش بیاید.

---

## چه چیزهایی را من نصب کردم

```powershell
npm install -g @nestjs/cli typescript ts-node
```

برای تأیید:

```powershell
nest -v
tsc -v
node -v
npm -v
```

---

## PostgreSQL — نصب از صفر تا صد (ویندوز)

نصب خودکار از این محیط به‌خاطر **خطای 403** از سرور EnterpriseDB ممکن نشد.
باید یک‌بار از مرورگر خودت نصب‌کننده را بگیری و اجرا کنی.

### ۱) دانلود

1. برو به: https://www.postgresql.org/download/windows/
2. روی **Download the installer** (EnterpriseDB) کلیک کن
3. نسخهٔ **17.x** ویندوز x86-64 را دانلود کن  
   (یا مستقیم از صفحهٔ EnterpriseDB نسخهٔ Windows x86-64)

### ۲) اجرای Installer

1. فایل `.exe` را Run as administrator اجرا کن
2. Next را بزن تا به تنظیمات برسی
3. **Components** پیشنهاد:
   - PostgreSQL Server ✅
   - Command Line Tools ✅ (`psql`)
   - pgAdmin 4 ✅ (GUI مفید)
   - Stack Builder ❌ (لازم نیست)
4. مسیر نصب پیش‌فرض معمولاً خوب است:  
   `C:\Program Files\PostgreSQL\17`
5. **Data Directory** را پیش‌فرض بگذار
6. **Password** برای کاربر `postgres` را انتخاب و **حتماً یادداشت کن**  
   پیشنهاد لوکال توسعه: یک رمز سادهٔ فقط-لوکال، مثلاً `fitsteel_dev`  
   ⚠️ این رمز را در git commit نکن
7. Port: **5432** (پیش‌فرض)
8. Locale: پیش‌فرض / یا `Persian, Iran` اگر موجود بود — برای توسعه معمولاً Default کافی است
9. نصب را تمام کن و Stack Builder را Skip/Cancel کن

### ۳) افزودن به PATH (اگر `psql` شناخته نشد)

1. Win → جستجو: **Environment Variables**
2. Path سیستم را Edit کن
3. این مسیر را اضافه کن (نسخه را با پوشهٔ واقعی چک کن):

```text
C:\Program Files\PostgreSQL\17\bin
```

4. **یک ترمینال جدید** PowerShell باز کن و بزن:

```powershell
psql --version
```

باید چیزی شبیه `psql (PostgreSQL) 17.x` ببینی.

### ۴) سرویس ویندوز

سرویس باید Automatic باشد. بررسی:

```powershell
Get-Service -Name "*postgres*"
```

اگر Stopped بود:

```powershell
Start-Service postgresql-x64-17
```

(نام دقیق سرویس ممکن است کمی فرق کند؛ از خروجی `Get-Service` بردار.)

### ۵) ساخت دیتابیس پروژه

```powershell
# ورود با کاربر postgres (رمز همانی که موقع نصب گذاشتی)
psql -U postgres
```

داخل `psql`:

```sql
CREATE USER fitsteel WITH PASSWORD 'fitsteel_dev';
CREATE DATABASE fitsteel OWNER fitsteel;
GRANT ALL PRIVILEGES ON DATABASE fitsteel TO fitsteel;
-- لازم برای prisma migrate dev (سایهٔ دیتابیس)
ALTER USER fitsteel CREATEDB;
\q
```

تست اتصال:

```powershell
psql -U fitsteel -d fitsteel -h localhost
```

### ۶) Connection string (برای Prisma / Nest)

در فایل `.env` بک‌اند (بعداً، وقتی اسکلت پروژه ساخته شد):

```env
DATABASE_URL="postgresql://fitsteel:fitsteel_dev@localhost:5432/fitsteel?schema=public"
```

این فایل را به git اضافه نکن.

---

## نصب‌کننده‌های پروژه‌ای (وقتی اسکلت کد ساخته شود)

این‌ها global لازم ندارند؛ موقع ساخت پروژه با npm می‌آیند:

```powershell
# فرانت
npx create-next-app@latest

# بک‌اند
nest new api

# داخل پروژه API
npm install prisma @prisma/client
npx prisma init
```

---

## چک‌لیست نهایی قبل از شروع کدنویسی

- [x] Node.js + npm
- [x] Git
- [x] NestJS CLI
- [x] PostgreSQL 17 — سرویس Running (`17.11`)
- [ ] `psql` در PATH سیستم (اختیاری؛ مسیر کامل بالا کار می‌کند)
- [x] دیتابیس و یوزر `fitsteel` تأیید / ساخته شده (+ `CREATEDB` برای migrate)
- [x] `npx prisma migrate dev --name init` + seed پایه؛ `/api/health` → `database: "up"`

مرحلهٔ بعد ساخت اپ: **Auth پایه** — جزئیات در `docs/handoff.md`.
