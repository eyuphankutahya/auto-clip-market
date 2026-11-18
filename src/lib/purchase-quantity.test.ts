import { expect, it } from "vitest";
import { changePurchaseQuantity, isPurchaseQuantity, roundUpPurchaseQuantity } from "./purchase-quantity";

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

it("stops increasing at the given maximum", () => {
  expect(changePurchaseQuantity(100000, 1, 100000)).toBe(100000);
  expect(changePurchaseQuantity(99900, 1, 100000)).toBe(100000);
});

it("rounds a suggested amount up to the next multiple of 100", () => {
  expect(roundUpPurchaseQuantity(0)).toBe(100);
  expect(roundUpPurchaseQuantity(2)).toBe(100);
  expect(roundUpPurchaseQuantity(49)).toBe(100);
  expect(roundUpPurchaseQuantity(100)).toBe(100);
  expect(roundUpPurchaseQuantity(101)).toBe(200);
  expect(roundUpPurchaseQuantity(150)).toBe(200);
});
