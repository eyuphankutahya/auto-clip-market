import { describe, expect, it } from "vitest";
import { auditCsvRow, auditFilterValues } from "./audit-history";
import { csvContent } from "./csv";

const filters = { table: "products", action: "UPDATE", actor: "user-1", from: "2026-11-14", to: "2026-11-14", search: " KM_10% " };
describe("işlem geçmişi filtreleri ve CSV", () => {
  it("kullanıcı ve işlem türünü birlikte korur", () => {
    expect(auditFilterValues(filters)).toMatchObject({ actor: "user-1", action: "UPDATE", table: "products", search: "KM\\_10\\%" });
  });
  it("tarih aralığının iki gün sınırını İstanbul takvimine göre hesaplar", () => {
    expect(auditFilterValues(filters)).toMatchObject({ from: "2026-11-13T21:00:00.000Z", to: "2026-11-14T21:00:00.000Z" });
  });
  it("ters tarih aralığıyla indirmeyi reddeder", () => {
    expect(() => auditFilterValues({ ...filters, to: "2026-11-13" })).toThrow();
  });
  it("CSV kullanıcıyı ve önceki/sonraki değerleri korur, formülü çalıştırmaz", () => {
    const row = auditCsvRow({ id: 7, created_at: "2026-11-14T09:00:00Z", actor_id: "user-1", table_name: "products", record_id: "p1", record_label: "=1+1", action: "UPDATE", before_data: { stock: 12 }, after_data: { stock: 9 } }, new Map([["user-1", "Yönetici"]]));
    expect(row.slice(2)).toEqual(["Yönetici", "user-1", "Ürünler", "=1+1", "Değiştirildi", '{"stock":12}', '{"stock":9}']);
    expect(csvContent([], [row])).toContain('"\'=1+1"');
  });
});