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
        if (!cancelled)
          setError("قیمت‌ها الان بارگذاری نشد. چند لحظه بعد صفحه را دوباره باز کنید.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="section" id="pricing">
      <h2>هزینه اشتراک ماهانه</h2>
      <p className="sub">
        شهریه بر اساس تعداد روزهای تمرین در هفته است. هر دوره دقیقاً ۳۰ روز است
        و ثبت‌نام حضوری در پذیرش انجام می‌شود.
      </p>
      {error ? <p className="price-note">{error}</p> : null}
      {!plans && !error ? (
        <p className="sub">در حال بارگذاری قیمت‌ها…</p>
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
        هزینهٔ برنامهٔ مربی و پیکرسنجی جداست. اشتراک خودکار تمدید نمی‌شود؛ اگر
        قبل از پایان دوره در پذیرش تمدید کنید، تخفیف تمدید زودتر شاملتان
        می‌شود.
      </p>
    </section>
  );
}
