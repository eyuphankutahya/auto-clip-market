import { expect, it } from "vitest";
import { changePurchaseQuantity, isPurchaseQuantity } from "./purchase-quantity";

it("selects purchases in multiples of 100", () => {
  expect(isPurchaseQuantity(100)).toBe(true);
  expect(isPurchaseQuantity(200)).toBe(true);
  expect(isPurchaseQuantity(150)).toBe(false);
  expect(isPurchaseQuantity(0)).toBe(false);
});
it("increases and decreases quantities by 100 without going below 100", () => {
  expect(changePurchaseQuantity(100, 1)).toBe(200);
  expect(changePurchaseQuantity(300, -1)).toBe(200);
  expect(changePurchaseQuantity(100, -1)).toBe(100);
});