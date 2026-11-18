import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import type { CatalogProduct } from "@/lib/catalog";

export type CatalogFilters = { q?: string | undefined; kategori?: string | undefined; marka?: string | undefined; sayfa?: number | undefined; slug?: string | undefined };
export const catalogPageQuery = (filters: CatalogFilters = {}) => queryOptions({
  queryKey: ["catalog-page", filters], staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("catalog_page", { _q: filters.q ?? "", _category: filters.kategori ?? "", _brand: filters.marka ?? "", _page: filters.sayfa ?? 1, _slug: filters.slug ?? "" });
    if (error) throw new Error(error.message);
    return data as unknown as { products: CatalogProduct[]; total: number; page: number };
  },
});
export const catalogFiltersQuery = queryOptions({
  queryKey: ["catalog-filters"], staleTime: 300_000,
  queryFn: async () => {
    const [categories, brands] = await Promise.all([
      supabase.from("categories").select("*").order("sort"),
      fetchAll((from, to) => supabase.from("brands").select("*").order("name").order("id").range(from, to)),
    ]);
    if (categories.error) throw new Error(categories.error.message);
    return { categories: categories.data ?? [], brands };
  },
});
