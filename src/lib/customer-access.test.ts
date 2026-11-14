import { describe, expect, it } from "vitest";
import { customerType, canCreateLinkedAccount } from "./customer-access";

describe("customer access", () => {
  it("a normal registered customer without cari remains regular", () => {
    expect(customerType(false, "customer", null)).toBe("regular");
  });
  it("an admin-created linked cari grants special-customer status", () => {
    expect(customerType(false, "customer", { user_id: "customer" })).toBe("special");
    expect(customerType(false, "customer", { user_id: "other" })).toBe("regular");
  });
  it("only the admin role grants superadmin status", () => {
    expect(customerType(true, "owner", null)).toBe("superadmin");
    expect(customerType(false, "owner", null)).toBe("regular");
  });
  it("special-customer account creation requires a registered customer and prevents duplicate links", () => {
    expect(canCreateLinkedAccount("customer", "Firma", new Set())).toBe(true);
    expect(canCreateLinkedAccount("", "Firma", new Set())).toBe(false);
    expect(canCreateLinkedAccount("customer", " ", new Set())).toBe(false);
    expect(canCreateLinkedAccount("customer", "Firma", new Set(["customer"]))).toBe(false);
  });
});