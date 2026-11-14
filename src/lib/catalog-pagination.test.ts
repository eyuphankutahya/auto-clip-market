import { describe, expect, it } from "vitest";
import { paginateCatalog } from "./catalog-pagination";

describe("catalog pagination", () => {
  const items = Array.from({ length: 53 }, (_, i) => i + 1);
  it("shows 24 items without accumulating previous pages", () => {
    expect(paginateCatalog(items, 1).items).toEqual(items.slice(0, 24));
    expect(paginateCatalog(items, 2).items).toEqual(items.slice(24, 48));
    expect(paginateCatalog(items, 3).items).toEqual([49, 50, 51, 52, 53]);
  });
  it("clamps the requested page after filtering", () => {
    expect(paginateCatalog([1, 2], 3)).toEqual({ page: 1, pages: 1, items: [1, 2] });
  });
  it("handles empty results", () => {
    expect(paginateCatalog([], 1)).toEqual({ page: 1, pages: 1, items: [] });
  });
});