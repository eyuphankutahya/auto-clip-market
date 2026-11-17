export function isPurchaseQuantity(quantity: number) {
  return Number.isSafeInteger(quantity) && quantity >= 100 && quantity % 100 === 0;
}

export function changePurchaseQuantity(quantity: number, direction: -1 | 1) {
  return Math.max(100, quantity + direction * 100);
}