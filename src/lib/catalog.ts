import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";

const productSelect = "*, category:categories(id,name,slug), oems:product_oem_numbers(id,oem), vehicles:product_vehicles(id,brand_id,model_id,brand:brands(name,slug),model:vehicle_models(name))";

async function fetchCatalog() {
  const [products, c, b, m] = await Promise.all([
    fetchAll((from, to) => supabase.from("products").select(productSelect).order("name").order("id").range(from, to)),
    supabase.from("categories").select("*").order("sort"),
    supabase.from("brands").select("*").order("name"),
    fetchAll((from, to) => supabase.from("vehicle_models").select("*").order("name").order("id").range(from, to)),
  ]);
  return { products, categories: c.data ?? [], brands: b.data ?? [], models: m };
}
export const catalogQuery = queryOptions({ queryKey: ["catalog"], queryFn: fetchCatalog, staleTime: 60_000 });
export type Catalog = Awaited<ReturnType<typeof fetchCatalog>>;
export type CatalogProduct = Catalog["products"][number];

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/[\s.-]/g, "");
/** Matches a search text against KlipsMarket no, product name and OEM numbers. */
export function matchesSearch(p: Pick<CatalogProduct, "name" | "sku" | "oems">, query: string) {
  const q = norm(query);
  if (!q) return true;
  return (p.sku ? norm(p.sku) === q : false) || norm(p.name).includes(q) || p.oems.some((o) => norm(o.oem).includes(q));
}
