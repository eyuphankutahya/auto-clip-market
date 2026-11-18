export function isPurchaseQuantity(quantity: number) {
  return Number.isSafeInteger(quantity) && quantity >= 100 && quantity % 100 === 0;
}

export function changePurchaseQuantity(quantity: number, direction: -1 | 1, max = Number.MAX_SAFE_INTEGER) {
  return Math.min(max, Math.max(100, quantity + direction * 100));
}

export function roundUpPurchaseQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) return 100;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(quantity / 100) * 100);
}
