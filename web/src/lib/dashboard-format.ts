/** Display helpers for member / admin dashboards. */

import { toAsciiDigits } from "./auth";

export function formatDurationMinutes(
  minutes: number | null | undefined,
): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  const m = Math.max(0, Math.floor(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem.toLocaleString("fa-IR")} دقیقه`;
  if (rem === 0) return `${h.toLocaleString("fa-IR")} ساعت`;
  return `${h.toLocaleString("fa-IR")} ساعت و ${rem.toLocaleString("fa-IR")} دقیقه`;
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "CASH":
      return "نقد";
    case "CARD_READER":
      return "کارت‌خوان";
    case "CARD_TRANSFER":
      return "کارت‌به‌کارت";
    default:
      return "سایر";
  }
}

export function formatToman(n: number): string {
  return `${n.toLocaleString("fa-IR")} تومان`;
}

const NICE_MILLION_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200];
const DAILY_TICK_DAYS = new Set([1, 5, 10, 15, 20, 25]);

function tomanFromMillions(millions: number): number {
  return Math.round(millions * 1_000_000);
}

/** Even axis in million toman. Numbers only — the word «میلیون» stays off the bars. */
export function chartValueAxis(maxToman: number): {
  maxToman: number;
  ticks: number[];
} {
  const maxM =
    Number.isFinite(maxToman) && maxToman > 0 ? maxToman / 1_000_000 : 0;
  if (maxM <= 0) {
    return {
      maxToman: 4_000_000,
      ticks: [0, 1_000_000, 2_000_000, 3_000_000, 4_000_000],
    };
  }
  for (const step of NICE_MILLION_STEPS) {
    const intervals = Math.ceil(maxM / step - 1e-9);
    if (intervals >= 2 && intervals <= 4) {
      const ticks = Array.from({ length: intervals + 1 }, (_, i) =>
        tomanFromMillions(i * step),
      );
      return { maxToman: ticks[ticks.length - 1]!, ticks };
    }
  }
  const step = 100;
  const intervals = Math.max(2, Math.ceil(maxM / step));
  const ticks = Array.from({ length: intervals + 1 }, (_, i) =>
    tomanFromMillions(i * step),
  );
  return { maxToman: ticks[ticks.length - 1]!, ticks };
}

/** Axis tick: «۵» or «۲٫۵», never «۵ میلیون». */
export function formatAxisTick(toman: number): string {
  const millions = toman / 1_000_000;
  const whole = Math.abs(millions - Math.round(millions)) < 0.001;
  return millions.toLocaleString("fa-IR", {
    minimumFractionDigits: whole ? 0 : 1,
    maximumFractionDigits: whole ? 0 : 1,
  });
}

/** One short figure above a wide month bar, e.g. «۱۱٫۰». */
export function formatChartMillions(toman: number): string {
  if (!Number.isFinite(toman) || toman <= 0) return "۰";
  return (toman / 1_000_000).toLocaleString("fa-IR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatChartTip(label: string, amountToman: number): string {
  return `${label} · ${formatToman(amountToman)}`;
}

export function leadingJalaliDay(label: string): number | null {
  const match = toAsciiDigits(label).match(/\d+/);
  if (!match) return null;
  const day = Number(match[0]);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  return day;
}

/** Daily chart: only ۱، ۵، ۱۰، ۱۵، ۲۰، ۲۵ and the last day, with a gap before the end. */
export function dailyChartLabelFlags(labels: string[]): boolean[] {
  const days = labels.map(leadingJalaliDay);
  const last = labels.length - 1;
  const lastDay = last >= 0 ? days[last] : null;
  return labels.map((_, index) => {
    if (index === last) return true;
    const day = days[index];
    if (day == null || !DAILY_TICK_DAYS.has(day)) return false;
    if (lastDay != null && lastDay > day && lastDay - day < 3) return false;
    return true;
  });
}

export function formatPageStatus(page: number, pageCount: number): string {
  return `صفحه ${page.toLocaleString("fa-IR")} از ${pageCount.toLocaleString("fa-IR")}`;
}
