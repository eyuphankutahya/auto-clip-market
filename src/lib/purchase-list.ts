import { isPurchaseQuantity } from "./purchase-quantity";

export type PurchaseSupplier = { supplier_id: string; name: string; code: string | null };
export type PurchaseProduct = { id: string; sku: string | null; name: string; suppliers: PurchaseSupplier[] };
export type PurchaseLine = { productId: string; sku: string | null; name: string; supplierId: string; supplierName: string; codes: string[]; quantity: number };

export function purchaseLine(product: PurchaseProduct, supplierId: string, quantity: number): PurchaseLine {
  const links = product.suppliers.filter((s) => s.supplier_id === supplierId);
  const supplier = links[0];
  if (!supplier) throw new Error(`${product.sku ?? product.name}: tedarikçi seçin.`);
  if (!isPurchaseQuantity(quantity)) throw new Error(`${product.sku ?? product.name}: 100 ve katları bir alım adedi girin.`);
  return { productId: product.id, sku: product.sku, name: product.name, supplierId, supplierName: supplier.name, codes: [...new Set(links.flatMap((s) => s.code ? [s.code] : []))], quantity };
}

export function mergePurchaseLines(current: PurchaseLine[], added: PurchaseLine[]) {
  const lines = new Map(current.map((line) => [line.productId, line]));
  for (const line of added) lines.set(line.productId, line);
  return [...lines.values()];
}

export function groupPurchaseLines(lines: PurchaseLine[]) {
  const groups = new Map<string, { supplierId: string; name: string; lines: PurchaseLine[] }>();
  for (const line of lines) {
    const group = groups.get(line.supplierId) ?? { supplierId: line.supplierId, name: line.supplierName, lines: [] };
    group.lines.push(line);
    groups.set(line.supplierId, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
}