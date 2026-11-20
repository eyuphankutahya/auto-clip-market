import { Label } from "@/components/ui/label";
import { categoryGroup, childCategories, mainCategories, type CatalogCategory } from "@/lib/catalog-groups";

type Props = {
  categories: CatalogCategory[];
  value: string;
  onChange: (categoryId: string) => void;
  idPrefix?: string;
  disabled?: boolean;
};

export function ProductCategoryFields({ categories, value, onChange, idPrefix = "product", disabled = false }: Props) {
  const selected = categories.find((category) => category.id === value);
  const group = categoryGroup(categories, selected);
  const children = childCategories(categories, group?.id);
  const selectClass = "h-9 w-full rounded-md border bg-background px-2 text-sm disabled:opacity-60";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-main-category`}>Ana ürün grubu</Label>
        <select id={`${idPrefix}-main-category`} disabled={disabled} className={selectClass} value={group?.id ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">Seçilmedi</option>
          {mainCategories(categories).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      {children.length > 0 && <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-subcategory`}>{group?.slug === "klips" ? "KLİPS türü / kullanım yeri" : "Alt kategori"}</Label>
        <select id={`${idPrefix}-subcategory`} disabled={disabled} className={selectClass} value={selected?.parent_id ? selected.id : group?.id ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value={group?.id}>Alt kategori seçilmedi</option>
          {children.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>}
    </div>
  );
}
