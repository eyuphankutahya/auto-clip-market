import { orderDateBounds } from "./order-export";

export function analysisPeriods(from: string, to: string) {
  if (!from || !to || from > to) throw new Error("Geçerli bir tarih aralığı seçin.");
  const bounds = orderDateBounds(from, to);
  if (!bounds.from || !bounds.to) throw new Error("Geçerli bir tarih aralığı seçin.");
  const start = new Date(bounds.from).getTime();
  const end = new Date(bounds.to).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Geçerli bir tarih aralığı seçin.");
  return { from: bounds.from, to: bounds.to, previousFrom: new Date(start - (end - start)).toISOString() };
}

export function percentageChange(current: number, previous: number) {
  return previous === 0 ? null : Math.round((current - previous) / previous * 1000) / 10;
}

export function toggleSelection(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
}

export const bulkOrderTargets: Record<string, readonly string[]> = {
  approved: ["pending"], shipped: ["approved"], cancelled: ["pending", "approved"],
};

export function eligibleOrderIds(orders: { id: string; status: string }[], target: string) {
  return orders.filter(order => bulkOrderTargets[target]?.includes(order.status)).map(order => order.id);
}

export const auditTables: Record<string, string> = {
  products: "Ürünler", orders: "Siparişler", customer_accounts: "Cari hesaplar", account_transactions: "Cari hareketleri",
  purchases: "Alımlar", suppliers: "Tedarikçiler", product_supplier_codes: "Tedarikçi kodları",
  product_oem_numbers: "OEM numaraları", product_vehicles: "Araç uyumu", categories: "Kullanım yerleri",
  brands: "Markalar", vehicle_models: "Modeller", stock_adjustments: "Stok düzeltmeleri",
};
export const auditFields: Record<string, string> = {
  name: "Ad", sku: "KM No", price: "Fiyat", stock: "Stok", min_stock: "Minimum stok", max_stock: "Maksimum stok",
  status: "Durum", total: "Toplam", order_no: "Sipariş No", discount_rate: "İskonto (%)", notes: "Not",
  company_name: "Firma", phone: "Telefon", address: "Adres", description: "Açıklama", type: "Hareket türü", amount: "Tutar",
  quantity: "Adet", unit_cost: "Alım fiyatı", code: "Tedarikçi kodu", oem: "OEM", new_stock: "Yeni stok",
  previous_stock: "Önceki stok", reason: "Açıklama", stock_alert_enabled: "Stok uyarısı", stock_alert_threshold: "Uyarı eşiği",
  package_quantity: "Paket adedi", category_id: "Kullanım yeri", product_id: "Ürün", supplier_id: "Tedarikçi",
  brand_id: "Marka", model_id: "Model", user_id: "Bağlı kullanıcı", customer_account_id: "Cari hesap",
};