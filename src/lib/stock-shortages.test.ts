import { describe, expect, it } from "vitest";
import { isStockShortage, replenishmentQuantity } from "./stock-shortages";

describe("stock shortages", () => {
  it("includes depleted stock even when minimum is zero", () => {
    expect(isStockShortage({ stock: 0, min_stock: 0 })).toBe(true);
  });
  it("includes below-minimum stock, not stock at minimum", () => {
    expect(isStockShortage({ stock: 49, min_stock: 50 })).toBe(true);
    expect(isStockShortage({ stock: 50, min_stock: 50 })).toBe(false);
    expect(isStockShortage({ stock: 100, min_stock: 50 })).toBe(false);
  });
  it("replenishes to maximum when set, otherwise minimum", () => {
    expect(replenishmentQuantity({ stock: 10, min_stock: 50, max_stock: 100 })).toBe(90);
    expect(replenishmentQuantity({ stock: 10, min_stock: 50, max_stock: null })).toBe(40);
    expect(replenishmentQuantity({ stock: 0, min_stock: 0, max_stock: null })).toBe(0);
  });
});
