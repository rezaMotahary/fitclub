import { describe, expect, it } from 'vitest';
import { paginatedResult, resolvePage } from './pagination.js';

describe('resolvePage', () => {
  it('defaults to page 1 and 20 rows', () => {
    expect(resolvePage({})).toEqual({
      page: 1,
      pageSize: 20,
      skip: 0,
      take: 20,
    });
  });

  it('page 2 does not overlap page 1 skip window', () => {
    const first = resolvePage({ page: 1, pageSize: 5 });
    const second = resolvePage({ page: 2, pageSize: 5 });
    expect(first.skip).toBe(0);
    expect(first.take).toBe(5);
    expect(second.skip).toBe(5);
    expect(second.take).toBe(5);
    expect(second.skip).toBe(first.skip + first.take);
  });

  it('treats limit as pageSize alias', () => {
    expect(resolvePage({ page: 3, limit: 10 })).toEqual({
      page: 3,
      pageSize: 10,
      skip: 20,
      take: 10,
    });
  });
});

describe('paginatedResult', () => {
  it('reports total and pageCount so the UI can show «صفحه ۲ از ۱۰»', () => {
    const page2 = paginatedResult(['c', 'd'], 20, 2, 2);
    const page1 = paginatedResult(['a', 'b'], 20, 1, 2);
    expect(page2.total).toBe(20);
    expect(page2.pageCount).toBe(10);
    expect(page2.items).not.toEqual(page1.items);
  });

  it('keeps pageCount at least 1 when the list is empty', () => {
    expect(paginatedResult([], 0, 1, 20).pageCount).toBe(1);
  });
});
