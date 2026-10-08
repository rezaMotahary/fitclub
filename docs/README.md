# مستندات پروژه فیت‌کلاب (FitClub)

همهٔ مستندات پروژه داخل همین پوشه (`docs/`) نگه‌داری می‌شوند.

## فهرست

| فایل | موضوع |
|------|--------|
| [project-identity.md](./project-identity.md) | نام پروژه، RTL، شمسی، نقش‌ها |
| [product-overview.md](./product-overview.md) | دامنه محصول، نقش‌ها و قابلیت‌ها (بر اساس پروتوتایپ) |
| [business-rules.md](./business-rules.md) | قوانین کسب‌وکار — منبع حقیقت منطق باشگاه |
| [user-roles-permissions.md](./user-roles-permissions.md) | ماتریس دسترسی عضو / منشی / مدیر |
| [domain-glossary.md](./domain-glossary.md) | واژه‌نامه ساده |
| [user-flows.md](./user-flows.md) | جریان‌های اصلی قدم‌به‌قدم |
| [mvp-scope.md](./mvp-scope.md) | هست / نیست نسخه اول |
| [open-questions.md](./open-questions.md) | سؤال‌های باز؛ تا جواب نیاید حدس زده نمی‌شود |
| [dev-environment.md](./dev-environment.md) | وضعیت نصب ابزارها + راهنمای نصب PostgreSQL |
| [handoff.md](./handoff.md) | حافظهٔ سشن بعد — از اینجا ادامه ساخت اپ |
| [collaboration.md](./collaboration.md) | سبک همکاری vibe coding — الزامی |
| [decision-policy.md](./decision-policy.md) | در ابهام از مالک بپرس (آستانه ~۹۰٪) |
| [sample-data.md](./sample-data.md) | داده نمونه اجباری — صفحه خالی ممنوع |
| [github-workflow.md](./github-workflow.md) | اتصال GitHub + push همیشگی + نسخه‌بندی |
| [testing.md](./testing.md) | تست اجباری برای هر فیچر + گزارش بعد از تغییر مهم |
| [adr/](./adr/) | Architecture Decision Records |
| [project-manager.md](./project-manager.md) | نقش چت مدیر پروژه / پروداکت منیجر |
| [prompts/complete-project-docs.md](./prompts/complete-project-docs.md) | پرامپت تکمیل کامل مستندات منطق |
| [prompts/project-manager-chat.md](./prompts/project-manager-chat.md) | پرامپت شروع چت اختصاصی مدیر پروژه |

## پروتوتایپ مرجع

نسخهٔ UI تأیید کارفرما در مسیر `../prototype/` قرار دارد (Cyan Night).

## قرارداد ADR

هر تصمیم معماری مهم به‌صورت یک فایل شماره‌دار در `adr/` ثبت می‌شود.
وضعیت‌های مجاز: `Proposed` · `Accepted` · `Deprecated` · `Superseded`.
