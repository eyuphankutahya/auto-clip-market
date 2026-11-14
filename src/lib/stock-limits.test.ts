import { expect, it } from "vitest";
import { validateStockLimits } from "./stock-limits";

it("allows an unspecified maximum", () => expect(validateStockLimits(50, null)).toBeNull());
it("allows a maximum equal to or above minimum", () => {
  expect(validateStockLimits(50, 50)).toBeNull();
  expect(validateStockLimits(50, 100)).toBeNull();
});
it("rejects a maximum below minimum", () => expect(validateStockLimits(50, 49)).not.toBeNull());
it("rejects negative and fractional stock thresholds", () => {
  expect(validateStockLimits(50, -1)).not.toBeNull();
  expect(validateStockLimits(50, 100.5)).not.toBeNull();
  expect(validateStockLimits(-1, 100)).not.toBeNull();
});