type LinkedProduct = {
  category: { slug: string } | null;
  vehicles: { brand_id: string; model_id: string | null }[];
};

export function matchesCatalogFilters(
  product: LinkedProduct,
  filters: { category?: string | undefined; brandId?: string | undefined; modelId?: string | undefined },
) {
  if (filters.category && product.category?.slug !== filters.category) return false;
  if (filters.brandId && !product.vehicles.some((v) => v.brand_id === filters.brandId)) return false;
  if (filters.modelId && !product.vehicles.some((v) =>
    v.model_id === filters.modelId || (v.brand_id === filters.brandId && v.model_id === null),
  )) return false;
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