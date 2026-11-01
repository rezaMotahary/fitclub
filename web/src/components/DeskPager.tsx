import { formatPageStatus } from "@/lib/dashboard-format";

export function DeskPager({
  page,
  pageCount,
  busy,
  onPage,
}: {
  page: number;
  pageCount: number;
  busy?: boolean;
  onPage: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav className="desk-pager" aria-label="صفحه‌بندی">
      <button
        type="button"
        className="desk-pager-btn"
        disabled={busy || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        قبلی
      </button>
      <span className="desk-pager-status">{formatPageStatus(page, pageCount)}</span>
      <button
        type="button"
        className="desk-pager-btn"
        disabled={busy || page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        بعدی
      </button>
    </nav>
  );
}
