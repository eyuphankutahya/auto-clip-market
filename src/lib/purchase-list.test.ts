import { describe, expect, it } from "vitest";
import { groupPurchaseLines, mergePurchaseLines, purchaseLine } from "./purchase-list";

const p14 = { id: "14", sku: "14", name: "Klips 14", suppliers: [{ supplier_id: "star", name: "STAR", code: "0198" }, { supplier_id: "star", name: "STAR", code: "0199" }, { supplier_id: "ata", name: "ATA", code: "55" }] };
const p29 = { id: "29", sku: "29", name: "Klips 29", suppliers: [{ supplier_id: "barutcu", name: "BARUTCU", code: "B29" }] };

describe("selected shortage purchase list", () => {
  it("groups product 14 under STAR and product 29 under BARUTCU", () => {
    const groups = groupPurchaseLines([purchaseLine(p14, "star", 31), purchaseLine(p29, "barutcu", 2)]);
    expect(groups.find((g) => g.supplierId === "star")?.lines.map((l) => l.sku)).toEqual(["14"]);
    expect(groups.find((g) => g.supplierId === "barutcu")?.lines.map((l) => l.sku)).toEqual(["29"]);
    expect(groups.find((g) => g.supplierId === "star")?.lines[0]?.codes).toEqual(["0198", "0199"]);
  });
  it("includes only selected products", () => {
    expect(mergePurchaseLines([], [purchaseLine(p14, "star", 31)]).map((l) => l.sku)).toEqual(["14"]);
  });
  it("reassigns rather than duplicates a product added again", () => {
    const lines = mergePurchaseLines([purchaseLine(p14, "star", 31)], [purchaseLine(p14, "ata", 20)]);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.supplierId).toBe("ata");
    expect(lines[0]?.quantity).toBe(20);
  });
  it("rejects suppliers not linked to the product", () => {
    expect(() => purchaseLine(p14, "barutcu", 31)).toThrow();
  });
  it("rejects zero and fractional purchase quantities", () => {
    expect(() => purchaseLine(p14, "star", 0)).toThrow();
    expect(() => purchaseLine(p14, "star", 1.5)).toThrow();
  });
});