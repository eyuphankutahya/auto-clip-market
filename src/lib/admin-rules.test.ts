import { describe, it, expect } from "vitest";
import { analysisPeriods, eligibleOrderIds, percentageChange, toggleSelection } from "./admin-rules";

describe("yönetim işlemleri", () => {
  it("karşılaştırma dönemini aynı uzunlukta önceki İstanbul günlerine alır", () => {
    expect(analysisPeriods("2026-11-14", "2026-11-14")).toEqual({ from: "2026-11-13T21:00:00.000Z", to: "2026-11-14T21:00:00.000Z", previousFrom: "2026-11-12T21:00:00.000Z" });
  });
  it("ters tarih aralığını reddeder", () => expect(() => analysisPeriods("2026-11-14", "2026-11-13")).toThrow());
  it("toplu onayı sadece bekleyen siparişlere uygular", () => {
    expect(eligibleOrderIds([{ id: "1", status: "pending" }, { id: "2", status: "shipped" }], "approved")).toEqual(["1"]);
  });
  it("toplu kargolamayı sadece onaylı siparişlere uygular", () => {
    expect(eligibleOrderIds([{ id: "1", status: "pending" }, { id: "2", status: "approved" }], "shipped")).toEqual(["2"]);
  });
  it("kargolanmış siparişleri toplu iptale dahil etmez", () => {
    expect(eligibleOrderIds([{ id: "1", status: "approved" }, { id: "2", status: "shipped" }, { id: "3", status: "pending" }], "cancelled")).toEqual(["1", "3"]);
  });
  it("önceki satış sıfırsa uydurma büyüme yüzdesi üretmez", () => {
    expect(percentageChange(100, 0)).toBe(null);
    expect(percentageChange(150, 100)).toBe(50);
  });
  it("seçimleri yinelenmeden açıp kapatır", () => {
    expect(toggleSelection(["1"], "1")).toEqual([]);
    expect(toggleSelection(["1"], "2")).toEqual(["1", "2"]);
  });
});