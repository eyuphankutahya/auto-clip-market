import { describe, expect, it } from "vitest";
import { clampQty } from "./cart";
describe("cart quantity", () => {
  it("cannot exceed stock (910 stock, 911 asked)", () => expect(clampQty(911, 910)).toBe(910));
  it("is at least 1", () => expect(clampQty(0, 910)).toBe(1));
  it("unknown stock has no upper cap", () => expect(clampQty(5000)).toBe(5000));
});
