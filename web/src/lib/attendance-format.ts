/** Display helpers for secretary attendance desk. */

export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function formatClockFa(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: "Asia/Tehran",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function resultLabel(result: string, isVoided: boolean): string {
  if (isVoided) return "باطل‌شده";
  switch (result) {
    case "SUCCESS":
      return "ورود موفق";
    case "REJECTED_WEEKLY_CAP":
      return "رد ورود — پر شدن سقف هفته";
    case "REJECTED_EXPIRED":
      return "رد ورود — پایان اشتراک";
    case "REJECTED_DEBT":
      return "رد ورود — بدهی شهریه";
    case "REJECTED_OUTSIDE_SESSION":
      return "رد ورود — خارج از ساعت سانس";
    case "REJECTED_ALREADY_INSIDE":
      return "رد ورود — حضور باز در سالن";
    case "REJECTED_ARCHIVED":
      return "رد ورود — عضو آرشیوشده";
    case "REJECTED_NOT_STARTED":
      return "رد ورود — اشتراک شروع‌نشده";
    default:
      return "رد ورود";
  }
}
