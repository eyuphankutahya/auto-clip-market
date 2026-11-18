// Pure logic for the admin bulk stock / product-card import (Excel or CSV rows → change plan).

export type ImportRow = Record<string, unknown>;
export type ExistingProduct = { id: string; sku: string | null; name: string; stock: number; price: number | string; revision?: number; is_active?: boolean };
export type Columns = { sku?: string | undefined; name?: string | undefined; stock?: string | undefined; price?: string | undefined };
export type Update = { id: string; sku: string | null; name: string; oldStock: number; stock?: number; oldPrice: number; revision: number; price?: number };
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

/** Parses unambiguous decimal text or a native spreadsheet number. */
export function parseNumber(v: unknown, allowCurrency = true): number | undefined {
  if (v == null) return undefined;
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const input = v.trim();
  if (!input) return undefined;
  const value = allowCurrency ? input.replace(/^₺\s*|\s*(?:₺|TL)$/gi, "") : input;
  if (/^-?\d+(?:\.\d{1,2})?$/.test(value)) return Number(value);
  if (/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(value)) {
    return Number(value.replace(/\./g, "").replace(",", "."));
  }
  return NaN;
}

/** Matches each row to a unique product by KM No or, when missing, normalized name. */
export function buildPlan(rows: ImportRow[], cols: Columns, products: ExistingProduct[]): Plan {
  const bySku = new Map<string, ExistingProduct[]>();
  const byName = new Map<string, ExistingProduct[]>();
  for (const product of products) {
    const sku = key(product.sku);
    const name = norm(product.name);
    if (sku) bySku.set(sku, [...(bySku.get(sku) ?? []), product]);
    if (name) byName.set(name, [...(byName.get(name) ?? []), product]);
  }
  const plan: Plan = { updates: [], creates: [], unchanged: 0, problems: [] };
  const seen = new Set<string>();

  rows.forEach((r, i) => {
    // SheetJS retains the source row number even when it skips blank rows.
    const sourceRow = r["__rowNum__"];
    const rowNo = typeof sourceRow === "number" ? sourceRow + 1 : i + 2;
    const sku = cols.sku ? key(r[cols.sku]) : "";
    const name = cols.name ? String(r[cols.name] ?? "").trim() : "";
    if (!sku && !name) return; // blank line
    const stock = cols.stock ? parseNumber(r[cols.stock], false) : undefined;
    const price = cols.price ? parseNumber(r[cols.price]) : undefined;
    if (stock !== undefined && (!Number.isInteger(stock) || stock < 0 || stock > 2147483647)) {
      return void plan.problems.push({ row: rowNo, reason: `“${cols.stock}” sütununda geçersiz stok adedi: ${String(r[cols.stock!])}. Tam sayıyı ayırıcısız yazın (ör. 1234).` });
    }
    if (price !== undefined && (!Number.isFinite(price) || price < 0 || price > 9999999999.99 || Number(price.toFixed(2)) !== price)) {
      return void plan.problems.push({ row: rowNo, reason: `“${cols.price}” sütununda geçersiz fiyat: ${String(r[cols.price!])}. En çok iki ondalık basamak kullanın (ör. 1234,50).` });
    }

    const matches = (sku ? bySku.get(sku) : byName.get(norm(name))) ?? [];
    if (matches.length > 1) {
      plan.problems.push({ row: rowNo, reason: sku ? `KM No ${sku} birden fazla kartla eşleşiyor` : `"${name}" birden fazla kartla eşleşiyor; KM No yazın` });
      return;
    }
    const p = matches[0];
    if (!p) {
      if (!sku || !name) return void plan.problems.push({ row: rowNo, reason: sku ? `KM No ${sku} sitede yok; yeni kart için ürün adı gerekli` : `"${name}" bulunamadı; KM No yazın` });
      if (seen.has(sku)) return void plan.problems.push({ row: rowNo, reason: `KM No ${sku} dosyada iki kez var` });
      seen.add(sku);
      plan.creates.push({ sku, name, stock: stock ?? 0, price: price ?? 0 });
      return;
    }
    if (seen.has(p.id)) return void plan.problems.push({ row: rowNo, reason: `${p.sku ?? p.name} dosyada iki kez var` });
    seen.add(p.id);
    if (p.is_active === false) {
      plan.problems.push({ row: rowNo, reason: `${p.sku ?? p.name}: Ürün pasif. Aktarımdan önce ürün yönetiminde tekrar satışa açın.` });
      return;
    }
    const u: Update = { id: p.id, sku: p.sku, name: p.name, oldStock: p.stock, oldPrice: Number(p.price), revision: p.revision ?? 0 };
    if (stock !== undefined && stock !== p.stock) u.stock = stock;
    if (price !== undefined && price !== Number(p.price)) u.price = price;
    if (u.stock === undefined && u.price === undefined) plan.unchanged++;
    else plan.updates.push(u);
  });
  return plan;
}
