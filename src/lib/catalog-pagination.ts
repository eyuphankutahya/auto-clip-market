export const CATALOG_PAGE_SIZE = 24;

export function paginateCatalog<T>(items: readonly T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(items.length / CATALOG_PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Math.floor(requestedPage)));
  const start = (page - 1) * CATALOG_PAGE_SIZE;
  return { page, pages, items: items.slice(start, start + CATALOG_PAGE_SIZE) };
}