const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
export const money = (n: number | string | null | undefined) => tl.format(Number(n ?? 0));
export const date = (d: string) => new Date(d).toLocaleDateString("tr-TR");
export function discounted(price: number, rate: number) {
  const cents = Math.round(price * 100);
  const multiplier = 10000 - Math.round(rate * 100);
  // Split the product to keep cents exact over the full database price range.
  const whole = Math.trunc(cents / 10000) * multiplier;
  const remainder = Math.round((cents % 10000) * multiplier / 10000);
  return (whole + remainder) / 100;
}
export const slugify = (s: string) =>
  s.toLowerCase().replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const STATUS: Record<string, string> = { pending: "Beklemede", approved: "Onaylandı", shipped: "Kargolandı", cancelled: "İptal" };
/** A product can be ordered only when it has a real price and is in stock. */
export const isOrderable = (price: number | string | null | undefined, stock: number) => Number(price ?? 0) > 0 && stock > 0;
