"use client";

import { useEffect, useState } from "react";
import { fetchPlans } from "@/lib/api";
import { formatTomanGrouped } from "@/lib/amount-input";
import { isFeaturedSitePlan, sitePlanNote } from "@/lib/site-plans";
import type { PlanPublic } from "@/lib/types";

export function SitePricing() {
  const [plans, setPlans] = useState<PlanPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPlans(false)
      .then((list) => {
        if (!cancelled) setPlans(list);
      })
      .catch(() => {
        if (!cancelled) setError("تعرفه الان خوانده نشد. کمی بعد صفحه را تازه کنید.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="section" id="pricing">
      <h2>هزینه اشتراک ماهانه</h2>
      <p className="sub">
        شهریه بر اساس تعداد روزهای حضور در هفته محاسبه می‌شود. قیمت‌ها برای دوره ۳۰
        روزه است و از تعرفهٔ باشگاه می‌آید.
      </p>
      {error ? <p className="price-note">{error}</p> : null}
      {!plans && !error ? (
        <p className="sub">در حال خواندن تعرفه…</p>
      ) : null}
      {plans ? (
        <div className="pricing">
          {plans.map((plan, index) => (
            <article
              key={plan.id}
              className={`price fade-in${index > 0 ? ` d${index + 1}` : ""}${
                isFeaturedSitePlan(plan.daysPerWeek) ? " featured-price" : ""
              }`}
            >
              <div className="days">{plan.name}</div>
              <div className="amount">
                {formatTomanGrouped(plan.priceToman)} <small>تومان</small>
              </div>
              <p>{sitePlanNote(plan.daysPerWeek)}</p>
            </article>
          ))}
        </div>
      ) : null}
      <p className="price-note">
        هزینه برنامه اختصاصی مربی و پیکرسنجی دوره‌ای جداگانه است. تمدید قبل از انقضا
        ممکن است تخفیف داشته باشد. اشتراک‌هایی که قبلاً فروخته شده‌اند مبلغ خودشان
        می‌مانند.
      </p>
    </section>
  );
}
