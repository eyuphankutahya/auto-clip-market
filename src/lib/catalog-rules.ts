type LinkedProduct = {
  category: { slug: string } | null;
  vehicles: { brand_id: string }[];
};

const codeCollator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });

export function compareProductCodes(a: { sku: string | null; id: string }, b: { sku: string | null; id: string }) {
  const left = a.sku?.trim() ?? "";
  const right = b.sku?.trim() ?? "";
  if (!left && right) return 1;
  if (left && !right) return -1;
  return codeCollator.compare(left, right) || a.id.localeCompare(b.id);
}

export function matchesCatalogFilters(
  product: LinkedProduct,
  filters: { category?: string | undefined; brandId?: string | undefined },
) {
  if (filters.category && product.category?.slug !== filters.category) return false;
  if (filters.brandId && !product.vehicles.some((v) => v.brand_id === filters.brandId)) return false;
  return true;
}

export function parseSupplierCodes(value: string): string[] {
  return [...new Set(value.split(/[,;\n]/).map((code) => code.trim()).filter(Boolean))];
}

export function supplierCodeRows(suppliers: Record<string, { on: boolean; code: string }>) {
  return Object.entries(suppliers).flatMap<{ supplier_id: string; code: string | null }>(([supplier_id, value]) => {
    if (!value.on) return [];
    const codes = parseSupplierCodes(value.code);
    return codes.length ? codes.map((code) => ({ supplier_id, code })) : [{ supplier_id, code: null }];
  });
}
