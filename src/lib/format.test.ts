import { describe, it, expect } from "vitest";
import { date, discounted, isOrderable, istanbulDay, istanbulDayStart, shiftCalendarDay } from "./format";
import { matchesSearch } from "./catalog";
describe("cari iskonto", () => {
  it("10% iskonto 6.75 TL -> 6.08 TL", () => expect(discounted(6.75, 10)).toBe(6.08));
  it("0% iskonto fiyatı değiştirmez", () => expect(discounted(4.5, 0)).toBe(4.5));
  it("rounds a half cent up like PostgreSQL numeric", () => expect(discounted(0.29, 50)).toBe(0.15));
});
it("uses Istanbul midnight for date labels and moves across calendar months", () => {
  const midnight = "2026-11-30T21:00:00Z";
  expect(istanbulDay(new Date("2026-11-30T20:59:59Z"))).toBe("2026-11-30");
  expect(istanbulDay(new Date(midnight))).toBe("2026-12-01");
  expect(istanbulDayStart("2026-12-01")).toBe("2026-11-30T21:00:00.000Z");
  expect(shiftCalendarDay("2026-12-01", -1)).toBe("2026-11-30");
  expect(date(midnight)).toBe(date("2026-12-01"));
});
describe("fiyatı girilmemiş ürün", () => {
  it("0 TL ürün stokta olsa da sepete eklenemez", () => expect(isOrderable(0, 100)).toBe(false));
  it("fiyatı ve stoğu olan ürün sipariş edilebilir", () => expect(isOrderable(2.5, 10)).toBe(true));
  it("stok yoksa sipariş edilemez", () => expect(isOrderable(2.5, 0)).toBe(false));
});
describe("arama", () => {
  const p = { name: "Klips Döşeme Kapı 1038008 Ford Ka", sku: "2A", oems: [{ id: "1", oem: "7703077469" }] };
  it("KlipsMarket no ile tam eşleşir", () => expect(matchesSearch(p, "2a")).toBe(true));
  it("KlipsMarket no kısmi eşleşmez (2 ≠ 2A)", () => expect(matchesSearch({ ...p, name: "x" }, "2")).toBe(false));
  it("OEM numarası ile bulunur", () => expect(matchesSearch(p, "7703 077469")).toBe(true));
});
