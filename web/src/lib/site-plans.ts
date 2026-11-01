/** Marketing copy for public pricing cards. Sessions ≈ 4 weeks × weekly cap. */

export function sitePlanNote(daysPerWeek: number): string {
  if (daysPerWeek >= 7) return "دسترسی کامل · هر روز هفته";
  const sessions = daysPerWeek * 4;
  const fa = sessions.toLocaleString("fa-IR");
  if (daysPerWeek === 2) return `شروع آرام · ${fa} جلسه در ماه`;
  if (daysPerWeek === 3) return `پرفروش · ${fa} جلسه در ماه`;
  if (daysPerWeek === 4) return `پیشرفت سریع · ${fa} جلسه در ماه`;
  return `${fa} جلسه در ماه`;
}

export function isFeaturedSitePlan(daysPerWeek: number): boolean {
  return daysPerWeek === 3;
}
