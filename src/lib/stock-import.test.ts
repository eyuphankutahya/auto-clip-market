import { describe, expect, it } from "vitest";
import { buildPlan, detectColumns, parseNumber } from "./stock-import";

const products = [
  { id: "a", sku: "208", name: "Kapı Döşeme Klipsi", stock: 100, price: 0 },
  { id: "b", sku: "209", name: "Fitil Klipsi", stock: 100, price: 5 },
];
const cols = detectColumns(["KLİPS_MARKET", "Stok Açıklaması", "Stok Adedi", "Satış Fiyatı"]);

describe("stock import", () => {
  it("detects KM No, name, stock and price columns without confusing 'Stok Açıklaması' with stock", () => {
    expect(cols).toEqual({ sku: "KLİPS_MARKET", name: "Stok Açıklaması", stock: "Stok Adedi", price: "Satış Fiyatı" });
  });
  it("parses Turkish-formatted numbers", () => {
    expect(parseNumber("1.234,50")).toBe(1234.5);
    expect(parseNumber("12,5 TL")).toBe(12.5);
    expect(parseNumber("")).toBeUndefined();
  });
  it("updates stock of an existing product matched by KM No", () => {
    const plan = buildPlan([{ "KLİPS_MARKET": 208, "Stok Adedi": 40 }], cols, products);
    expect(plan.updates).toEqual([{ id: "a", sku: "208", name: "Kapı Döşeme Klipsi", oldStock: 100, stock: 40, oldPrice: 0 }]);
  });
  it("counts rows with the same stock and price as unchanged", () => {
    const plan = buildPlan([{ "KLİPS_MARKET": "209", "Stok Adedi": 100, "Satış Fiyatı": 5 }], cols, products);
    expect(plan.updates).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });
  it("creates a new product card for an unknown KM No with a name", () => {
    const plan = buildPlan([{ "KLİPS_MARKET": "999", "Stok Açıklaması": "Yeni Klips", "Stok Adedi": 20 }], cols, products);
    expect(plan.creates).toEqual([{ sku: "999", name: "Yeni Klips", stock: 20, price: 0 }]);
  });
  it("rejects negative or fractional stock", () => {
    expect(buildPlan([{ "KLİPS_MARKET": "208", "Stok Adedi": -3 }], cols, products).problems).toHaveLength(1);
    expect(buildPlan([{ "KLİPS_MARKET": "208", "Stok Adedi": 2.5 }], cols, products).problems).toHaveLength(1);
  });
  it("rejects an unknown KM No without a name", () => {
    expect(buildPlan([{ "KLİPS_MARKET": "777", "Stok Adedi": 5 }], cols, products).problems[0]?.row).toBe(2);
  });
});
