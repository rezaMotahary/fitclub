export const RECEPTION_MEMBER_PAGE_SIZE = 8;
export const RECEPTION_LOG_PAGE_SIZE = 8;
export const RECEPTION_INSIDE_PAGE_SIZE = 8;
export const RECEPTION_PAYMENT_PAGE_SIZE = 8;

export type ListPage<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
};

/** Client page for lists the API returns in one shot (today log, inside). */
export function slicePage<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): ListPage<T> {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size) || 1);
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: safePage,
    pageCount,
    total,
  };
}

export type SearchNotice = { ok?: string; error?: string };

export function memberSearchNotice(total: number): SearchNotice {
  if (total <= 0) return { error: "عضوی پیدا نشد." };
  return {
    ok: `${total.toLocaleString("fa-IR")} عضو پیدا شد.`,
  };
}
