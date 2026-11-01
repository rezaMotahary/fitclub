/** Shared page/skip math for staff list endpoints. */

export const DEFAULT_PAGE_SIZE = 20;

export function resolvePage(params: {
  page?: number;
  pageSize?: number;
  limit?: number;
}): { page: number; pageSize: number; skip: number; take: number } {
  const rawSize = params.pageSize ?? params.limit ?? DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(100, Math.max(1, Math.trunc(rawSize) || DEFAULT_PAGE_SIZE));
  const page = Math.max(1, Math.trunc(params.page ?? 1) || 1);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export function paginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  const safeTotal = Math.max(0, Math.trunc(total) || 0);
  return {
    items,
    total: safeTotal,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(safeTotal / pageSize) || 1),
  };
}
