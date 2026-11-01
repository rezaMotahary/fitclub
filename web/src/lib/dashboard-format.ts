/** Display helpers for member / admin dashboards. */

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

/** Compact bar label so amounts stay readable without hover. */
export function formatChartAmount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "۰";
  if (n >= 1_000_000) {
    const millions = n / 1_000_000;
    const text = millions.toLocaleString("fa-IR", {
      maximumFractionDigits: millions >= 10 ? 0 : 1,
    });
    return `${text} میلیون`;
  }
  if (n >= 1000) {
    const thousands = n / 1000;
    const text = thousands.toLocaleString("fa-IR", {
      maximumFractionDigits: Number.isInteger(thousands) ? 0 : 0,
    });
    return `${text} هزار`;
  }
  return n.toLocaleString("fa-IR");
}

export function formatPageStatus(page: number, pageCount: number): string {
  return `صفحه ${page.toLocaleString("fa-IR")} از ${pageCount.toLocaleString("fa-IR")}`;
}
