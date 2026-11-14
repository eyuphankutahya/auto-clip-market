import { parseSupplierCodes, supplierCodeRows } from "@/lib/catalog-rules";
import { slugify } from "@/lib/format";
import { parsePackageQuantity } from "@/lib/package-quantity";
import { validateStockLimits } from "@/lib/stock-limits";

export type ProductSupplierInput = Record<string, { on: boolean; code: string }>;

export type NewProductForm = {
  sku: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  min_stock: string;
  max_stock: string;
  package_quantity: string;
  category_id: string;
  image_url: string;
  oems: string;
  brands: string[];
  models: string[];
  sups: ProductSupplierInput;
};

export const emptyNewProduct: NewProductForm = {
  sku: "", name: "", description: "", price: "", stock: "0", min_stock: "50",
  max_stock: "", package_quantity: "", category_id: "", image_url: "", oems: "",
  brands: [], models: [], sups: {},
};

export function parseOemNumbers(value: string): string[] {
  return [...new Set(value.split(/[,;\n]/).map((oem) => oem.trim()).filter(Boolean))];
}

export function buildNewProductArgs(
  form: NewProductForm,
  models: { id: string; brand_id: string }[],
) {
  const name = form.name.trim();
  if (!name) throw new Error("Ürün adı zorunludur");

  const price = form.price.trim() === "" ? 0 : Number(form.price);
  if (!Number.isFinite(price) || price < 0) throw new Error("Satış fiyatı sıfır veya pozitif bir sayı olmalı");

  const stock = Number(form.stock);
  if (!Number.isInteger(stock) || stock < 0) throw new Error("Açılış stoğu sıfır veya pozitif bir tam sayı olmalı");

  const minStock = Number(form.min_stock);
  const maxStock = form.max_stock.trim() === "" ? null : Number(form.max_stock);
  const limitsError = validateStockLimits(minStock, maxStock);
  if (limitsError) throw new Error(limitsError);

  const vehicles = [
    ...form.brands.map((brand_id) => ({ brand_id, model_id: null })),
    ...form.models.flatMap((modelId) => {
      const model = models.find((item) => item.id === modelId);
      return model ? [{ brand_id: model.brand_id, model_id: model.id }] : [];
    }),
  ];

  return {
    _product: {
      sku: form.sku.trim(), name, slug: slugify(`${name} ${form.sku.trim() || Date.now()}`),
      description: form.description.trim(), image_url: form.image_url.trim(), price,
      min_stock: minStock, max_stock: maxStock,
      package_quantity: parsePackageQuantity(form.package_quantity),
      category_id: form.category_id || null,
    },
    _oems: parseOemNumbers(form.oems),
    _vehicles: vehicles,
    _supplier_codes: supplierCodeRows(form.sups),
    _initial_stock: stock,
  };
}

export function supplierHasCodes(value: { on: boolean; code: string }): boolean {
  return value.on && parseSupplierCodes(value.code).length > 0;
}
