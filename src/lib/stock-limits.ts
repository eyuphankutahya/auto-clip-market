export function validateStockLimits(min: number, max: number | null): string | null {
  if (!Number.isInteger(min) || min < 0) return "Minimum stok sıfır veya pozitif bir tam sayı olmalı";
  if (max !== null && (!Number.isInteger(max) || max < 0)) return "Maksimum stok sıfır veya pozitif bir tam sayı olmalı";
  if (max !== null && max < min) return "Maksimum stok minimum stoktan küçük olamaz";
  return null;
}