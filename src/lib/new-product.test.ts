import { describe, expect, it } from "vitest";
import { buildNewProductArgs, emptyNewProduct, parseOemNumbers } from "@/lib/new-product";

describe("new product module", () => {
  it("builds a complete product with multiple OEMs, brands and supplier codes", () => {
    const args = buildNewProductArgs({
      ...emptyNewProduct,
      sku: "KM-2000", name: "Çamurluk klipsi", price: "12.50", stock: "100",
      min_stock: "20", max_stock: "500", package_quantity: "10", category_id: "category-1",
      oems: "12345, 67890\n12345", brands: ["brand-2", "brand-1"],
      sups: { "supplier-1": { on: true, code: "A1, A2" }, "supplier-2": { on: false, code: "X" } },
    });

    expect(args._initial_stock).toBe(100);
    expect(args._product.price).toBe(12.5);
    expect(args._oems).toEqual(["12345", "67890"]);
    expect(args._vehicles).toEqual([
      { brand_id: "brand-2", model_id: null },
      { brand_id: "brand-1", model_id: null },
    ]);
    expect(args._supplier_codes).toEqual([
      { supplier_id: "supplier-1", code: "A1" },
      { supplier_id: "supplier-1", code: "A2" },
    ]);
  });

  it("keeps an empty price as unavailable and initial stock at zero", () => {
    const args = buildNewProductArgs({ ...emptyNewProduct, name: "Yeni klips" });
    expect(args._product.price).toBe(0);
    expect(args._initial_stock).toBe(0);
  });

  it.each([
    [{ ...emptyNewProduct, name: "" }, "Ürün adı zorunludur"],
    [{ ...emptyNewProduct, name: "Klips", stock: "-1" }, "Açılış stoğu"],
    [{ ...emptyNewProduct, name: "Klips", stock: "1.5" }, "Açılış stoğu"],
    [{ ...emptyNewProduct, name: "Klips", min_stock: "20", max_stock: "10" }, "Maksimum stok"],
    [{ ...emptyNewProduct, name: "Klips", package_quantity: "0" }, "Paket adedi"],
  ])("rejects invalid input", (form, message) => {
    expect(() => buildNewProductArgs(form)).toThrow(message);
  });

  it("trims and deduplicates OEM numbers", () => {
    expect(parseOemNumbers(" A; B\nA, ,C ")).toEqual(["A", "B", "C"]);
  });
});
