export type StockLevel = { stock: number; min_stock: number; max_stock: number | null };

export function isStockShortage(product: StockLevel) {
  return product.stock === 0 || product.stock < product.min_stock;
}

export function replenishmentQuantity(product: StockLevel) {
  return Math.max(0, (product.max_stock ?? product.min_stock) - product.stock);
}