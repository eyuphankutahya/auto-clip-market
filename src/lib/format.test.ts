import { describe, it, expect } from "vitest";
import { discounted } from "./format";
describe("cari iskonto", () => {
  it("10% iskonto 6.75 TL -> 6.08 TL", () => expect(discounted(6.75, 10)).toBe(6.08));
  it("0% iskonto fiyatı değiştirmez", () => expect(discounted(4.5, 0)).toBe(4.5));
});
