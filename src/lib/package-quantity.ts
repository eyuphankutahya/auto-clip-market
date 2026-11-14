export function parsePackageQuantity(input: string): number | null {
  if (!input.trim()) return null;
  const quantity = Number(input);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 2147483647) {
    throw new Error("Paket adedi pozitif bir tam sayı olmalı");
  }
  return quantity;
}