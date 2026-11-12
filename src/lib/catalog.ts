import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async () => {
    const [p, c, b, m] = await Promise.all([
      supabase.from("products").select("*, category:categories(id,name,slug), oems:product_oem_numbers(id,oem), vehicles:product_vehicles(id,brand_id,model_id,brand:brands(name,slug),model:vehicle_models(name))").order("name"),
      supabase.from("categories").select("*").order("sort"),
      supabase.from("brands").select("*").order("name"),
      supabase.from("vehicle_models").select("*").order("name"),
    ]);
    if (p.error) throw p.error;
    return { products: p.data ?? [], categories: c.data ?? [], brands: b.data ?? [], models: m.data ?? [] };
  },
});
export type Catalog = Awaited<ReturnType<NonNullable<typeof catalogQuery.queryFn>>>;
export type CatalogProduct = Catalog["products"][number];
