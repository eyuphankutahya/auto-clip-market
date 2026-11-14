import { describe, expect, it } from "vitest";
import { contactSchema } from "./contact";

const valid = { name: "Ziyaretçi", email: "visitor@example.com", subject: "Ürün sorusu", message: "Toyota klipsi arıyorum." };

describe("contact validation", () => {
  it.each(["name", "subject", "message"] as const)("rejects empty %s", (field) => {
    expect(contactSchema.safeParse({ ...valid, [field]: "   " }).success).toBe(false);
  });
  it("rejects an invalid email", () => {
    expect(contactSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
  it.each([["name", 100], ["email", 255], ["subject", 200], ["message", 5000]] as const)("bounds %s", (field, limit) => {
    const value = field === "email" ? `${"a".repeat(limit - 12)}@example.com` : "a".repeat(limit);
    expect(contactSchema.safeParse({ ...valid, [field]: value }).success).toBe(true);
    expect(contactSchema.safeParse({ ...valid, [field]: `a${value}` }).success).toBe(false);
  });
  it("trims fields and removes extra input", () => {
    expect(contactSchema.parse({ ...valid, subject: " Ürün sorusu ", to: "other@example.com" })).toEqual(valid);
  });
});