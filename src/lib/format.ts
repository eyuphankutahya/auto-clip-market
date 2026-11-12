const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
export const money = (n: number | string | null | undefined) => tl.format(Number(n ?? 0));
export const date = (d: string) => new Date(d).toLocaleDateString("tr-TR");
export const discounted = (price: number, rate: number) => Math.round(price * (1 - rate / 100) * 100) / 100;
export const slugify = (s: string) =>
  s.toLowerCase().replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const STATUS: Record<string, string> = { pending: "Beklemede", approved: "Onaylandı", shipped: "Kargolandı", cancelled: "İptal" };
