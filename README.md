# فیت‌کلاب (FitClub)

نرم‌افزار مدیریت باشگاه بدنسازی **فیت‌کلاب** — وبسایت ریسپانسیو + پنل عضو / منشی / ادمین.

> برند باشگاه در پروتوتایپ UI ممکن است «فیت‌استیل» باشد؛ نام پروژه نرم‌افزاری **FitClub** است.

## ساختار

```text
fitclub/
├── docs/         مستندات و ADRها
├── prototype/    پروتوتایپ UI (Cyan Night)
├── web/          فرانت‌اند — Next.js + TypeScript + Tailwind
└── api/          بک‌اند — NestJS + Prisma + PostgreSQL
```

## استک (Accepted)

جزئیات در `docs/adr/0003-technology-stack.md`.

| لایه | تکنولوژی |
|------|-----------|
| Frontend | Next.js (App Router) + TypeScript + Tailwind |
| Backend | NestJS + TypeScript + Prisma |
| Database | PostgreSQL |

## شروع سریع (بعد از نصب PostgreSQL)

```powershell
# API
cd api
copy .env.example .env
# DATABASE_URL را در .env تنظیم کن
npm install
npx prisma migrate dev --name init
npm run start:dev

# Web (ترمینال جدا)
cd web
copy .env.example .env.local
npm install
npm run dev
```

- Web: http://localhost:3000  
- API: http://localhost:3001  

راهنمای محیط: `docs/dev-environment.md`  
هandoff سشن بعد: `docs/handoff.md`
