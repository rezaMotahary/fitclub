# پرامپت — فیکس خروج + ظاهر صفحهٔ راهنما + آپدیت سرور

کپی کن و در چت برنامه‌نویس بفرست. مالک ترمینال نمی‌زند.

---

## متن پرامپت

```text
تو برنامه‌نویس فیت‌کلاب هستی. دو باگ روی سایت زنده گزارش شده. فیکس کن، تست بنویس، به GitHub بفرست، بعد سرور را بدون پاک کردن داده آپدیت کن. مالک ترمینال نمی‌زند. گزارش خیلی ساده.

سایت زنده: https://fitclubapp.shop
راهنما: https://fitclubapp.shop/how-to-open
ورود سرور: D:\server.txt را بخوان. رمز را در گیت/داک/گزارش عمومی نگذار.
مسیر آپدیت: docs/server-update.md · داده: docs/production-data.md

بخوان: docs/known-issues.md (KI-017، KI-018)، docs/theme.md، docs/project-identity.md، docs/security.md، web/src/components/StaffPanelGate.tsx، PanelFrame.tsx، AuthGate.tsx، AttendanceDesk.tsx، AdminDesk.tsx، MemberDashboard.tsx، web/src/lib/api.ts، api/src/auth/auth.controller.ts (setSessionCookie / clearSessionCookie)، web/src/app/how-to-open/page.tsx، web/src/app/globals.css (.sample-box، .ltr-isolate).

## KI-017 — خروج کار نمی‌کند
مالک با پنل منشی روی سرور وارد شد، «خروج» زد، صفحه فقط رفرش شد و داخل حساب ماند. باید برای منشی، مدیر، و عضو درست شود.

انتظار: بعد از خروج، جلسه بسته شود و صفحهٔ ورود همان نقش دیده شود — نه همان پنل با حساب قبلی.

احتمال قوی روی سرور: کوکی httpOnly پشت پروکسی /api با path یا domain یا secure ست می‌شود، ولی clearCookie همان مشخصات را ندارد؛ یا nginx Path کوکی را /api می‌کند. ورود کار می‌کند چون Set-Cookie می‌آید؛ خروج نه، چون کوکی نمی‌میرد. بعد window.location به همان home پنل می‌رود → رفرش و ماندن داخل حساب.

درست کن:
1) ست و پاک کردن کوکی با همان path، domain، secure، sameSite. اگر پروکسی Path را عوض می‌کند، nginx را هم جور کن (مثلاً proxy_cookie_path) تا کوکی روی کل دامنه fitclubapp.shop باشد و logout آن را پاک کند.
2) بعد از logout موفق، اگر هنوز /auth/me کاربر برمی‌گرداند، فیکس کامل نیست.
3) هر سه نقش: منشی، مدیر، عضو. دکمهٔ خروج در همهٔ پنل‌ها (سایدبار و جاهای دیگر) همان رفتار را داشته باشد.
4) تست: لاگین → logout → /auth/me باید ۴۰۱؛ و UI دیگر پنل را نشان ندهد. اگر می‌توانی کوکی با path=/api را هم شبیه‌سازی کن. رقم فارسی موضوع این باگ نیست.

## KI-018 — ظاهر /how-to-open
اسکرین مالک: لینک کامل https://fitclubapp.shop/<توکن-بلند>/reception از کارت بیرون زده. ظاهر جذاب نیست.

درست کن:
- لینک از کادر بیرون نزند (wrap / دکمه / کارت جدا برای هر نقش). .ltr-isolate الان inline-block است و URL بلند نمی‌شکند.
- صفحه مرتب، خوانا، با برند فیت‌کلاب، تم روشن و تاریک، RTL. ایمیل/رمز/URL با dir=ltr و ltr-isolate تا ! جابه‌جا نشود.
- حساب‌های نمونه همان بمانند. دکمهٔ ورود منشی/ادمین/عضو مفید است تا مجبور نباشند URL خام را کپی کنند؛ اگر URL نشان داده می‌شود باید داخل کارت بشکند.
- لینک مخفی پرسنل را در گیت، داک، تست، اسکرین، و پیام عمومی ننویس.
- عکس/لوگوی تازه اگر لازم شد خودت بساز.

## سرور (بعد از سبز شدن تست لوکال)
- هرگز seed، migrate reset، drop، wipe. DEMO_MODE اجازهٔ پاک کردن نمی‌دهد.
- بکاپ → pull → migrate deploy → build → restart طبق docs/server-update.md (سرویس‌ها fitclub-web و fitclub-api، پوشه /opt/fitclub).
- روی https://fitclubapp.shop خودت چک کن: خروج منشی/مدیر/عضو؛ /how-to-open بدون بیرون‌زدن لینک در دسکتاپ و عرض موبایل؛ تم روشن و تاریک.
- VERSION را اگر لازم دیدی بالا ببر. commit + push. اسرار نه.

ممنوع: پاک کردن دادهٔ سرور، لو کردن توکن پرسنل، دستور ترمینال به مالک، پیامک اجباری.

پایان به مالک ساده: خروج درست شد یا نه؛ صفحهٔ راهنما مرتب شد یا نه؛ لینک https://fitclubapp.shop/how-to-open. ببرد QA. به PM بگوید: «KI-017 و KI-018 فیکس شد و سرور آپدیت شد» یا دقیق بگوید چه مانده.
```
