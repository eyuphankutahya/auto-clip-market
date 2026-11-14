import { describe, expect, it } from "vitest";
import { matchesCatalogFilters, supplierCodeRows } from "./catalog-rules";

const shared = { category: { slug: "camurluk" }, vehicles: [{ brand_id: "toyota", model_id: null }, { brand_id: "ford", model_id: "focus" }] };
const fordOnly = { category: { slug: "camurluk" }, vehicles: [{ brand_id: "ford", model_id: null }] };
const toyotaDoor = { category: { slug: "kapi" }, vehicles: [{ brand_id: "toyota", model_id: null }] };
const products = [shared, fordOnly, toyotaDoor];

describe("catalog relationship rules", () => {
  it("lists all Toyota products regardless of location", () => {
    expect(products.filter((p) => matchesCatalogFilters(p, { brandId: "toyota" }))).toEqual([shared, toyotaDoor]);
  });
  it("lists fender clips from every brand", () => {
    expect(products.filter((p) => matchesCatalogFilters(p, { category: "camurluk" }))).toEqual([shared, fordOnly]);
  });
  it("intersects brand and location when both are selected", () => {
    expect(products.filter((p) => matchesCatalogFilters(p, { category: "camurluk", brandId: "toyota" }))).toEqual([shared]);
  });
  it("a shared product appears under every linked brand", () => {
    expect(matchesCatalogFilters(shared, { brandId: "ford" })).toBe(true);
    expect(matchesCatalogFilters(shared, { brandId: "toyota" })).toBe(true);
    expect(matchesCatalogFilters(shared, { brandId: "honda" })).toBe(false);
  });
  it("preserves multiple suppliers and multiple codes within one supplier", () => {
    expect(supplierCodeRows({ star: { on: true, code: "7069, 7070\n7069" }, ata: { on: true, code: "266" }, hidden: { on: false, code: "999" } })).toEqual([
      { supplier_id: "star", code: "7069" }, { supplier_id: "star", code: "7070" }, { supplier_id: "ata", code: "266" },
    ]);
  });
});