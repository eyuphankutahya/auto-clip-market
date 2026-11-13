// Pure logic for the admin bulk stock / product-card import (Excel or CSV rows → change plan).

export type ImportRow = Record<string, unknown>;
export type ExistingProduct = { id: string; sku: string | null; name: string; stock: number; price: number | string };
export type Columns = { sku?: string | undefined; name?: string | undefined; stock?: string | undefined; price?: string | undefined };
export type Update = { id: string; sku: string | null; name: string; oldStock: number; stock?: number; oldPrice: number; price?: number };
export type Create = { sku: string; name: string; stock: number; price: number };
export type Problem = { row: number; reason: string };
export type Plan = { updates: Update[]; creates: Create[]; unchanged: number; problems: Problem[] };

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/[^a-z0-9çğıöşü]/g, "");
const key = (s: unknown) => String(s ?? "").trim().toUpperCase();

/** Finds which spreadsheet headers hold KM No, product name, stock quantity and sales price. */
export function detectColumns(headers: string[]): Columns {
  const h = headers.map((x) => ({ raw: x, n: norm(x) }));
  const find = (test: (n: string) => boolean) => h.find((x) => test(x.n))?.raw;
  const name = find((n) => n.includes("açıklama") || n.includes("ürünadı") || n === "ad" || n === "urunadi");
  return {
    sku: find((n) => n.includes("klipsmarket") || n.includes("klips_market") || n === "kmno" || n === "km" || n === "sku"),
    name,
    stock: h.find((x) => x.raw !== name && (x.n.includes("stok") || x.n.includes("adet") || x.n.includes("miktar")) && !x.n.includes("açıklama") && !x.n.includes("kritik"))?.raw,
    price: find((n) => n.includes("fiyat")),
  };
}

/** Parses "1.234,50", "12,5", "100" or numbers. Returns undefined for empty cells, NaN for junk. */
export function parseNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || String(v).trim() === "") return undefined;
  if (typeof v === "number") return v;
  let s = String(v).trim().replace(/[₺\sTL]/gi, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return s === "" ? undefined : Number(s);
}

/** Matches each row to a product by KM No (then exact name) and lists what will change. */
export function buildPlan(rows: ImportRow[], cols: Columns, products: ExistingProduct[]): Plan {
  const bySku = new Map(products.filter((p) => p.sku).map((p) => [key(p.sku), p]));
  const byName = new Map(products.map((p) => [norm(p.name), p]));
  const plan: Plan = { updates: [], creates: [], unchanged: 0, problems: [] };
  const seen = new Set<string>();

  rows.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const sku = cols.sku ? key(r[cols.sku]) : "";
    const name = cols.name ? String(r[cols.name] ?? "").trim() : "";
    if (!sku && !name) return; // blank line
    const stock = cols.stock ? parseNumber(r[cols.stock]) : undefined;
    const price = cols.price ? parseNumber(r[cols.price]) : undefined;
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0)) return void plan.problems.push({ row: rowNo, reason: `Stok adedi geçersiz: ${String(r[cols.stock!])}` });
    if (price !== undefined && (Number.isNaN(price) || price < 0)) return void plan.problems.push({ row: rowNo, reason: `Fiyat geçersiz: ${String(r[cols.price!])}` });

    const p = (sku && bySku.get(sku)) || (!sku && name ? byName.get(norm(name)) : undefined);
    if (!p) {
      if (!sku || !name) return void plan.problems.push({ row: rowNo, reason: sku ? `KM No ${sku} sitede yok; yeni kart için ürün adı gerekli` : `"${name}" bulunamadı; KM No yazın` });
      if (seen.has(sku)) return void plan.problems.push({ row: rowNo, reason: `KM No ${sku} dosyada iki kez var` });
      seen.add(sku);
      plan.creates.push({ sku, name, stock: stock ?? 0, price: price ?? 0 });
      return;
    }
    if (seen.has(p.id)) return void plan.problems.push({ row: rowNo, reason: `${p.sku ?? p.name} dosyada iki kez var` });
    seen.add(p.id);
    const u: Update = { id: p.id, sku: p.sku, name: p.name, oldStock: p.stock, oldPrice: Number(p.price) };
    if (stock !== undefined && stock !== p.stock) u.stock = stock;
    if (price !== undefined && price !== Number(p.price)) u.price = price;
    if (u.stock === undefined && u.price === undefined) plan.unchanged++;
    else plan.updates.push(u);
  });
  return plan;
}
