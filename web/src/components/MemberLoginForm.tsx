"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, requestMemberOtp, verifyMemberOtp } from "@/lib/api";
import {
  clampIranMobileInput,
  isValidIranMobile,
  normalizeIranMobile,
} from "@/lib/auth";
import { ThemeToggle } from "./ThemeToggle";

type Step = "phone" | "code";

export function MemberLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const normalized = normalizeIranMobile(phone);
    if (!isValidIranMobile(normalized)) {
      setError("شماره موبایل را مثل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.");
      return;
    }
    setPending(true);
    try {
      await requestMemberOtp(normalized);
      setPhone(normalized);
      setStep("code");
      setInfo("کد ارسال شد. در محیط توسعه از کد ۱۲۳۴۵۶ استفاده کنید.");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "ارسال کد ناموفق بود.");
      } else {
        setError("ارتباط با سرور برقرار نشد. API را روشن کنید.");
      }
    } finally {
      setPending(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await verifyMemberOtp(phone, code.trim());
      router.replace("/member");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401 || err.status === 403
            ? "کد نادرست است یا این شماره اجازه ورود ندارد."
            : err.message || "تأیید کد ناموفق بود.",
        );
      } else {
        setError("ارتباط با سرور برقرار نشد. API را روشن کنید.");
      }
      setPending(false);
    }
  }

  return (
    <main className="auth-shell">
      <ThemeToggle className="theme-toggle-float" />
      <div className="auth-card">
        <div className="auth-card-top">
          <p className="brand-mark">FITCLUB</p>
        </div>
        <h1>ورود اعضا</h1>
        <p className="auth-lead">با موبایل و کد یک‌بارمصرف</p>

        {step === "phone" ? (
          <form className="auth-form" onSubmit={onRequestOtp}>
            <label className="auth-field">
              <span>شماره موبایل</span>
              <input
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                className="ltr-isolate"
                value={phone}
                onChange={(e) => setPhone(clampIranMobileInput(e.target.value))}
                placeholder="09121234567"
                required
              />
            </label>
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
              {pending ? "در حال ارسال…" : "دریافت کد"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={onVerify}>
            <p className="auth-muted">
              کد برای{" "}
              <span className="ltr-isolate" dir="ltr">
                {phone}
              </span>{" "}
              ارسال شد.
            </p>
            <label className="auth-field">
              <span>کد ۶ رقمی</span>
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                className="ltr-isolate"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                required
                minLength={6}
                maxLength={6}
              />
            </label>
            {info ? <p className="auth-info">{info}</p> : null}
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="btn btn-primary auth-submit" type="submit" disabled={pending}>
              {pending ? "در حال تأیید…" : "ورود"}
            </button>
            <button
              type="button"
              className="btn btn-ghost auth-submit"
              disabled={pending}
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(null);
                setInfo(null);
              }}
            >
              تغییر شماره
            </button>
          </form>
        )}

        <div className="auth-hint">
          <p>
            نمونه عضو:{" "}
            <span className="ltr-isolate" dir="ltr">
              09121234567
            </span>
          </p>
          <p>
            کد توسعه:{" "}
            <span className="ltr-isolate" dir="ltr">
              123456
            </span>
          </p>
        </div>

        <div className="cta-row auth-links">
          <Link className="btn btn-ghost" href="/login/staff">
            ورود پرسنل
          </Link>
          <Link className="btn btn-ghost" href="/">
            سایت عمومی
          </Link>
        </div>
      </div>
    </main>
  );
}
