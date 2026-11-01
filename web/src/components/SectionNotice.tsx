export type SectionNoticeState = { ok?: string; error?: string };

export function SectionNotice({
  notice,
}: {
  notice: SectionNoticeState | null | undefined;
}) {
  if (!notice) return null;
  if (notice.error) return <p className="auth-error">{notice.error}</p>;
  if (notice.ok) return <p className="desk-ok">{notice.ok}</p>;
  return null;
}
