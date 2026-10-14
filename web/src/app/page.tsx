import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const amenities = [
  "سالن وزنه مجزا",
  "سالن هوازی",
  "کمد مغناطیسی",
  "رختکن و دوش",
  "تهویه مطبوع",
  "سیستم صوتی",
  "بوفه ورزشی",
  "پارکینگ اختصاصی",
  "سونای خشک",
  "پیکرسنجی",
  "مشاوره تغذیه",
  "ماساژ ورزشی",
];

const plans = [
  {
    days: "۲ روز در هفته",
    amount: "۸۹۰٬۰۰۰",
    note: "شروع آرام · ۸ جلسه در ماه",
  },
  {
    days: "۳ روز در هفته",
    amount: "۱٬۱۹۰٬۰۰۰",
    note: "پرفروش · ۱۲ جلسه در ماه",
    featured: true,
  },
  {
    days: "۴ روز در هفته",
    amount: "۱٬۴۵۰٬۰۰۰",
    note: "پیشرفت سریع · ۱۶ جلسه",
  },
  {
    days: "هر روز در هفته",
    amount: "۱٬۷۹۰٬۰۰۰",
    note: "دسترسی کامل ماهانه",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <section className="hero">
        <div className="hero-content">
          <div className="brand">FITCLUB</div>
          <h1>
            بدن قوی‌تر، <em>عادت ماندگار</em>
          </h1>
          <p>
            باشگاه بدنسازی فیت‌کلاب در سعادت‌آباد؛ تمرین حرفه‌ای، مربی‌گری تخصصی و
            مدیریت شفاف عضویت.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#pricing">
              مشاهده اشتراک‌ها
            </a>
            <a className="btn btn-ghost" href="#contact">
              رزرو مشاوره رایگان
            </a>
            <Link className="btn btn-ghost" href="/login/member">
              ورود اعضا
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="about">
        <h2>معرفی باشگاه</h2>
        <p className="sub">
          از سال ۱۳۹۸ با تمرکز روی بدنسازی، فیتنس و بادی‌کلاسیک فعالیت می‌کنیم؛ فضای
          تمرینی منظم با تجهیزات برند و کادر ثابت.
        </p>
        <div className="info-strip">
          <article>
            <strong>۱۲۰۰ متر</strong>
            <span>متراژ سالن وزنه و هوازی</span>
          </article>
          <article>
            <strong>۳۸۰ عضو فعال</strong>
            <span>آقایان و بانوان در سانس‌های مجزا</span>
          </article>
          <article>
            <strong>تأسیس ۱۳۹۸</strong>
            <span>۸ سال تجربه مدیریت باشگاه</span>
          </article>
        </div>
        <div className="about-extra">
          <div className="kv about-kv">
            <div>
              <span>برند دستگاه بدنسازی</span>
              <strong>Technogym / Life Fitness</strong>
            </div>
            <div>
              <span>برند هوازی</span>
              <strong>Matrix / Impulse</strong>
            </div>
            <div>
              <span>ارتفاع سقف سالن</span>
              <strong>۴٫۲ متر</strong>
            </div>
            <div>
              <span>ظرفیت هم‌زمان</span>
              <strong>تا ۸۵ نفر</strong>
            </div>
          </div>
          <div className="about-note">
            <h3>آنالیز رایگان بدن برای اعضای جدید</h3>
            <p>
              در اولین حضور، پیکرسنجی و مشاوره برنامه تمرینی توسط مربی شیفت انجام
              می‌شود. ثبت‌نام حضوری یا از طریق تماس با پذیرش.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="amenities">
        <h2>امکانات باشگاه</h2>
        <p className="sub">
          امکاناتی که معمولاً در پروفایل باشگاه‌های ایرانی برای تصمیم‌گیری اعضا نمایش
          داده می‌شود.
        </p>
        <div className="amenity-grid">
          {amenities.map((item) => (
            <article key={item}>{item}</article>
          ))}
        </div>
      </section>

      <section className="section" id="schedule">
        <h2>ساعات کاری و سانس‌ها</h2>
        <p className="sub">سانس آقایان و بانوان به‌صورت جداگانه برگزار می‌شود.</p>
        <div className="schedule-grid">
          <article className="panel schedule-card">
            <h3>سانس آقایان</h3>
            <div className="kv">
              <div>
                <span>شنبه تا چهارشنبه</span>
                <strong>۱۵:۰۰ تا ۲۳:۰۰</strong>
              </div>
              <div>
                <span>پنج‌شنبه</span>
                <strong>۱۵:۰۰ تا ۲۲:۰۰</strong>
              </div>
              <div>
                <span>جمعه</span>
                <strong>۱۶:۰۰ تا ۲۱:۰۰</strong>
              </div>
              <div>
                <span>رشته‌ها</span>
                <strong>پرورش اندام، فیتنس، بادی‌کلاسیک</strong>
              </div>
            </div>
          </article>
          <article className="panel schedule-card">
            <h3>سانس بانوان</h3>
            <div className="kv">
              <div>
                <span>شنبه تا چهارشنبه</span>
                <strong>۰۷:۰۰ تا ۱۴:۳۰</strong>
              </div>
              <div>
                <span>پنج‌شنبه</span>
                <strong>۰۷:۰۰ تا ۱۳:۳۰</strong>
              </div>
              <div>
                <span>جمعه</span>
                <strong>تعطیل</strong>
              </div>
              <div>
                <span>رشته‌ها</span>
                <strong>فیتنس، کار با دستگاه، فانکشنال</strong>
              </div>
            </div>
          </article>
        </div>
        <p className="price-note">
          ساعت‌ها نمونه هستند و تعرفه/سانس رسمی بعداً از پنل مدیریت تنظیم می‌شود.
        </p>
      </section>

      <section className="section" id="coaches">
        <h2>مربیان باشگاه</h2>
        <p className="sub">کادر ثابت مربی برای برنامه‌نویسی تمرین و نظارت روی فرم حرکت.</p>
        <div className="coach-grid">
          <article className="panel coach-card">
            <div className="coach-avatar">ر م</div>
            <h3>رضا مرادی</h3>
            <p>مربی ارشد آقایان · درجه ۲ فدراسیون</p>
            <ul>
              <li>تخصص: هایپرتروفی و بادی‌کلاسیک</li>
              <li>شیفت: عصر و شب</li>
            </ul>
          </article>
          <article className="panel coach-card">
            <div className="coach-avatar">ن ک</div>
            <h3>نیلوفر کاظمی</h3>
            <p>مربی بانوان · تغذیه ورزشی</p>
            <ul>
              <li>تخصص: کاهش چربی و فرم‌دهی</li>
              <li>شیفت: صبح</li>
            </ul>
          </article>
          <article className="panel coach-card">
            <div className="coach-avatar">ا ن</div>
            <h3>امیر نوری</h3>
            <p>مربی فانکشنال و هوازی</p>
            <ul>
              <li>تخصص: آمادگی جسمانی عمومی</li>
              <li>شیفت: چرخشی</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section" id="gallery">
        <h2>گالری باشگاه</h2>
        <p className="sub">نمایی از سالن وزنه، بخش هوازی و فضای رفاهی باشگاه.</p>
        <div className="gallery-grid">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/weights.jpg" alt="سالن وزنه فیت‌کلاب" />
            <figcaption>سالن وزنه و رک‌ها</figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cardio.jpg" alt="سالن هوازی فیت‌کلاب" />
            <figcaption>زون هوازی</figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/amenities.jpg" alt="امکانات رفاهی فیت‌کلاب" />
            <figcaption>رختکن و امکانات رفاهی</figcaption>
          </figure>
        </div>
      </section>

      <section className="section" id="pricing">
        <h2>هزینه اشتراک ماهانه</h2>
        <p className="sub">
          شهریه بر اساس تعداد روزهای حضور در هفته محاسبه می‌شود. قیمت‌ها برای دوره ۳۰
          روزه است و فقط نمونه هستند.
        </p>
        <div className="pricing">
          {plans.map((plan, index) => (
            <article
              key={plan.days}
              className={`price fade-in${index > 0 ? ` d${index + 1}` : ""}${
                plan.featured ? " featured-price" : ""
              }`}
            >
              <div className="days">{plan.days}</div>
              <div className="amount">
                {plan.amount} <small>تومان</small>
              </div>
              <p>{plan.note}</p>
            </article>
          ))}
        </div>
        <p className="price-note">
          هزینه برنامه اختصاصی مربی و پیکرسنجی دوره‌ای جداگانه است. تمدید قبل از انقضا
          ۱۰٪ تخفیف دارد. این اعداد تعرفه رسمی نیستند.
        </p>
      </section>

      <section className="section" id="contact">
        <h2>اطلاعات تماس و آدرس</h2>
        <p className="sub">برای بازدید حضوری یا ثبت‌نام با پذیرش هماهنگ کنید.</p>
        <div className="contact-grid">
          <article className="panel">
            <h3>راه‌های ارتباطی</h3>
            <div className="kv">
              <div>
                <span>تلفن ثابت</span>
                <strong>۰۲۱-۲۲۱۱۳۳۴۴</strong>
              </div>
              <div>
                <span>موبایل / واتساپ</span>
                <strong>۰۹۱۲۳۴۵۶۷۸۹</strong>
              </div>
              <div>
                <span>اینستاگرام</span>
                <strong>@fitclub.club</strong>
              </div>
              <div>
                <span>ایمیل</span>
                <strong>info@fitclub.ir</strong>
              </div>
            </div>
          </article>
          <article className="panel">
            <h3>آدرس باشگاه</h3>
            <p className="address">
              تهران، سعادت‌آباد، میدان کاج، خیابان سرو شرقی، پلاک ۱۲۸، طبقه منفی یک
            </p>
            <div className="kv">
              <div>
                <span>نزدیک‌ترین مترو</span>
                <strong>ایستگاه میلاد</strong>
              </div>
              <div>
                <span>پارکینگ</span>
                <strong>۳۰ جای پارک اختصاصی</strong>
              </div>
              <div>
                <span>پذیرش</span>
                <strong>هم‌زمان با ساعت سانس‌ها</strong>
              </div>
            </div>
            <div className="cta-row" style={{ marginTop: 16 }}>
              <Link className="btn btn-primary" href="/login/member">
                ورود پنل اعضا
              </Link>
              <Link className="btn btn-ghost" href="/login/staff">
                ورود پرسنل
              </Link>
              <a className="btn btn-ghost" href="tel:02122113344">
                تماس با باشگاه
              </a>
            </div>
          </article>
        </div>
      </section>

      <footer className="footer site-footer">
        <div>
          <strong>فیت‌کلاب</strong>
          <span>باشگاه بدنسازی و تناسب اندام · سعادت‌آباد</span>
        </div>
        <div>
          <Link href="/how-to-open">چطور باز کنم؟</Link>
          <span> · Cyan Night</span>
        </div>
      </footer>
    </>
  );
}
