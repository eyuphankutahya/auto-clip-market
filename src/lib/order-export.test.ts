import { describe, expect, it } from "vitest";
import { matchesCustomer, orderDateBounds, orderDetailRows, orderListRow } from "./order-export";
import { csvContent } from "./csv";

const order = { order_no: 7, created_at: "2026-11-14T09:00:00Z", status: "approved", discount_rate: 10, notes: null, total: 45,
  items: [{ id: "1", product_name: "Klips", quantity: 2, unit_price: 9, product: { sku: "2A" } },
    { id: "2", product_name: "Tapa", quantity: 3, unit_price: 9, product: { sku: "10" } }] };

describe("sipariş filtreleri ve dışa aktarım", () => {
  it("başlangıç ve bitiş günlerini İstanbul saatine göre dahil eder", () => {
    expect(orderDateBounds("2026-11-14", "2026-11-14")).toEqual({ from: "2026-11-13T21:00:00.000Z", to: "2026-11-14T21:00:00.000Z" });
  });
  it("Türkçe müşteri adını büyük küçük harften bağımsız eşleştirir", () => {
    expect(matchesCustomer("DİZAYNIR", " dizaynır ")).toBe(true);
    expect(matchesCustomer("ATA", "star")).toBe(false);
  });
  it("listeye her sipariş için tek satır ve toplam adet koyar", () => {
    expect(orderListRow(order, "Dizaynır", "a@example.test").slice(4, 8)).toEqual(["Onaylandı", 10, 5, 45]);
  });
  it("ayrıntılarda siparişin bütün ürünlerini ve kayıtlı fiyatlarını korur", () => {
    expect(orderDetailRows(order).map(row => row.slice(4, 10))).toEqual([["2A", "Klips", 2, 9, 18, 45], ["10", "Tapa", 3, 9, 27, 45]]);
  });
  it("CSV formüllerini etkisizleştirir, alıntıları ve Türkçe karakterleri korur", () => {
    expect(csvContent(["Ürün"], [['=1+1'], ['Klips "A"'], [-2]])).toBe('\uFEFF"Ürün"\r\n"\'=1+1"\r\n"Klips ""A"""\r\n"-2"');
  });
});