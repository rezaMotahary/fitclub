# پرامپت — بالا آوردن سایت روی دامنهٔ واقعی

کپی کن و در چت برنامه‌نویس بفرست. مالک ترمینال نمی‌زند.

اسرار ورود سرور داخل این فایل نیست. عامل باید `D:\server.txt` را بخواند و **هرگز** رمز را در گیت، داک، یا گزارش عمومی نگذارد.

---

## متن پرامپت

```text
تو برنامه‌نویس فیت‌کلاب هستی. هدف: سایت را از GitHub روی سرور واقعی مالک بالا بیاوری تا روی دامنه باز شود. مالک ترمینال نمی‌زند. گزارش خیلی ساده.

دامنهٔ عمومی: https://fitclubapp.shop
ورود سرور: فایل D:\server.txt را بخوان (IP، کاربر، رمز، دامنه). این فایل بیرون از ریپو است. محتوایش را commit نکن، در docs ننویس، در پیام عمومی تکرار نکن.

ریپو: git@github.com:rezaMotahary/fitclub.git  (شاخه main)

بخوان و همان را اجرا کن:
- docs/production-data.md — داده هرگز پاک نشود
- docs/server-update.md — env، bootstrap، بکاپ، آپدیت
- docs/security.md — چک‌لیست روز سرور
- docs/hosting.md · docs/pwa.md · docs/handoff.md

قانون دائمی داده:
- هرگز prisma db seed روی سرور
- هرگز migrate reset / drop database / wipe
- DEMO_MODE اجازهٔ پاک کردن نمی‌دهد
- بار اول: prisma migrate deploy سپس npm run bootstrap:server (بدون wipe؛ فقط ۱ مدیر + ۱ منشی + ۱ عضو تست اگر نبودند)
- دادهٔ فیک لوکال (سارا، بدهی ساختگی، چند عضو نمایشی) روی سرور نرود
- قبل از هر کار مخرب روی دیتابیس موجود، بکاپ

این سرور آموزشی است:
- DEMO_MODE=true و NEXT_PUBLIC_DEMO_MODE=true
- OTP_DEV_CODE=123456 ؛ پیامک خاموش
- /how-to-open برای همه باز
- بقیهٔ قفل‌های امنیتی بمانند
- محدودیت تلاش OTP همان بماند

کار تو:
1) SSH به سرور. اگر اوبونتو ۲۲/۲۴ نبود، همان لینوکس را با احتیاط ادامه بده و در گزارش بگو.
2) DNS: رکورد A برای fitclubapp.shop و در صورت وجود www → همان IP. اگر به پنل دامنه دسترسی نداری، تا جایی که از سرور می‌شود جلو برو و به مالک خیلی ساده بگو اگر صفحه باز نشد دامنه هنوز به سرور وصل نیست.
3) فایروال: فقط ۲۲ و ۸۰ و ۴۴۳ از اینترنت. پورت ۳۰۰۰، ۳۰۰۱، ۵۴۳۲ بسته.
4) نصب: Node 22 LTS، PostgreSQL، nginx، git، certbot. در صورت RAM کم، swap بساز تا build نترکد.
5) کاربر/رمز پستگرس تصادفی قوی (نه fitsteel_dev). دیتابیس خالی.
6) کلون از GitHub روی سرور (deploy key فقط خواندنی اگر ریپو خصوصی است؛ کلید را در گیت پروژه نگذار).
7) env روی سرور بساز، commit نشود:
   API: NODE_ENV=production، DEMO_MODE=true، OTP_DEV_CODE=123456، KAVENEGAR_ENABLED=false، WEB_ORIGIN=https://fitclubapp.shop، TRUST_PROXY=1، DATABASE_URL قوی، PORT=3001
   وب قبل از build: NEXT_PUBLIC_DEMO_MODE=true، NEXT_PUBLIC_SITE_URL=https://fitclubapp.shop، NEXT_PUBLIC_API_URL=https://fitclubapp.shop/api
   STAFF_PATH_SECRETARY و STAFF_PATH_ADMIN رشته‌های تازه حداقل ۳۲ حرف، متفاوت، بدون واژهٔ admin/secretary/staff/fitclub. در گیت و داک ننویس. در /how-to-open از env می‌آید.
8) داخل api: migrate deploy سپس bootstrap:server — نه seed.
9) nginx: سایت به وب، /api به API. https با Let’s Encrypt برای fitclubapp.shop (و www اگر هست، به دامنهٔ اصلی redirect).
10) وب و API را با systemd یا pm2 طوری روشن کن که بعد از ریبوت سرور خودشان بالا بیایند. بستن خودکار خروج آخر سانس همان برنامه است؛ با روشن بودن API کار می‌کند.
11) بکاپ: پوشهٔ مطلق بیرون از پروژه، npm run backup:db، زمان‌بندی شبانه. مسیر را در docs/server-update.md به شکل کلی بنویس نه با رمز.
12) رمز root را اگر هنوز همان فایل اولیه است به یک رمز قوی تصادفی عوض کن و فقط داخل D:\server.txt (همان ماشین مالک) به‌روز کن — در گیت نه.
13) docs را به‌روز کن: دامنهٔ عمومی fitclubapp.shop، وضعیت «سایت روی اینترنت است». IP را اگر لازم است بدون رمز. اسرار نه.
14) VERSION را اگر نقطهٔ عطف بالا آمدن دیدی بالا ببر، commit + push. اسرار را commit نکن.

بعد از بالا آمدن خودت در مرورگر چک کن:
- https://fitclubapp.shop باز می‌شود
- /how-to-open باز است و لینک منشی/مدیر و حساب تست را نشان می‌دهد
- ورود عضو با موبایل نمونه و کد 123456
- /admin و /secretary کوتاه → ۴۰۴
- /api از همان دامنه پاسخ می‌دهد
- PWA/https سالم است

اگر گیر کردی، داده را پاک نکن تا «درست شود». بکاپ بگیر و بگو کجا گیر کرد.

ممنوع: seed لوکال، migrate reset، drop، کپی داستان فیک، لو کردن رمز سرور/لینک پرسنل در گیت، دستور ترمینال به مالک، پیامک اجباری.

پایان به مالک خیلی ساده:
- لینک سایت: https://fitclubapp.shop
- راهنما: https://fitclubapp.shop/how-to-open
- بگو از راهنما وارد شود (منشی / مدیر / عضو با 123456)
- اگر دامنه هنوز وصل نبود، یک جملهٔ غیر فنی
بعد ببرد QA روی آدرس واقعی. به PM بگوید: «سایت روی دامنه بالا آمد» یا دقیق بگوید چه مانده.
```
