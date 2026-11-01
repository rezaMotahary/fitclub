import { toAsciiDigits } from "./auth";

export function parseJalaliDateInput(raw: string): string | null {
  const ascii = toAsciiDigits(raw.trim());
  const match = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(ascii);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1300 ||
    year > 1500 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parsePercentInput(raw: string): number | null {
  const ascii = toAsciiDigits(raw.trim());
  if (!ascii || !/^\d+$/.test(ascii)) return null;
  const n = Number(ascii);
  if (!Number.isInteger(n) || n < 0 || n > 100) return null;
  return n;
}

export type AdminOverviewQuery =
  | { iranYear: string; iranMonth: string }
  | { from: string; to: string };

export function buildAdminOverviewQuery(input: {
  iranYear: number;
  iranMonth: number;
  fromInput: string;
  toInput: string;
}): AdminOverviewQuery | { error: string } {
  const fromRaw = input.fromInput.trim();
  const toRaw = input.toInput.trim();
  if (fromRaw || toRaw) {
    if (!fromRaw || !toRaw) {
      return { error: "برای بازه سفارشی، هم «از» و هم «تا» را بنویسید." };
    }
    const from = parseJalaliDateInput(fromRaw);
    const to = parseJalaliDateInput(toRaw);
    if (!from || !to) {
      return { error: "تاریخ از یا تا درست نیست. نمونه: ۱۴۰۴/۰۷/۰۱" };
    }
    if (from > to) {
      return { error: "تاریخ «از» نباید بعد از «تا» باشد." };
    }
    return { from, to };
  }
  return {
    iranYear: String(input.iranYear),
    iranMonth: String(input.iranMonth),
  };
}

export function scaleChartBars<T extends { amountToman: number }>(
  points: T[],
  maxHeight: number,
): Array<T & { height: number }> {
  const max = Math.max(...points.map((p) => p.amountToman), 0);
  if (max <= 0) {
    return points.map((p) => ({ ...p, height: 0 }));
  }
  return points.map((p) => ({
    ...p,
    height: (p.amountToman / max) * maxHeight,
  }));
}

export function adminOverviewQueryString(
  query: AdminOverviewQuery,
): string {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
