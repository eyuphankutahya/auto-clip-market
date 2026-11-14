import { expect, it } from "vitest";
import { parsePackageQuantity } from "./package-quantity";

it("leaves unknown package quantities blank", () => {
  expect(parsePackageQuantity("")).toBeNull();
});
it("accepts positive whole package quantities", () => {
  expect(parsePackageQuantity("100")).toBe(100);
  expect(parsePackageQuantity("1")).toBe(1);
});
it("rejects zero, negative and fractional quantities", () => {
  for (const value of ["0", "-1", "2.5", "abc", "2147483648"]) {
    expect(() => parsePackageQuantity(value)).toThrow();
  }
});