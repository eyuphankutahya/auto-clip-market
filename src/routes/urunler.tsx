import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { catalogFiltersQuery, catalogPageQuery } from "@/lib/catalog-page";
import { categoryGroup, categoryLabel, childCategories, mainCategories } from "@/lib/catalog-groups";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pager } from "@/components/site/Pager";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog-pagination";

const search = z.object({
  q: z.union([z.string(), z.number().transform(String)]).pipe(z.string().max(200)).optional(),
  kategori: z.string().max(200).optional(),
  marka: z.string().max(200).optional(),
  sayfa: z.coerce.number().int().min(1).max(100000).catch(1).optional(),
});

export const Route = createFileRoute("/urunler")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Ürün Kataloğu — KlipsMarket" },
      { name: "description", content: "Klips, soket, jant ve oto bakım ürünlerini ana grup, alt kategori ve araç markasına göre filtreleyin." },
      { property: "og:title", content: "Ürün Kataloğu — KlipsMarket" },
      { property: "og:description", content: "OEM numarası, ana ürün grubu, alt kategori ve araç markasıyla ürün bulun." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Products,
});

function Products() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/urunler" });
  const set = (patch: Partial<z.infer<typeof search>>) => navigate({
    search: (prev) => ({ ...prev, ...patch, sayfa: undefined }),
    resetScroll: false,
  });
  const { data, isError: filtersFailed, refetch: refetchFilters } = useQuery(catalogFiltersQuery);
  const { data: result, isLoading, isError, refetch } = useQuery(catalogPageQuery(s));
  const categories = data?.categories ?? [];
  const brand = data?.brands.find((item) => item.slug === s.marka);
  const category = categories.find((item) => item.slug === s.kategori);
  const group = categoryGroup(categories, category);
  const subcategories = childCategories(categories, group?.id);
  const groups = mainCategories(categories);
  const list = result?.products ?? [];
  const total = result?.total ?? 0;
  const paginated = { page: result?.page ?? 1, items: list };
  const changePage = (page: number) => {
    void navigate({ search: (prev) => ({ ...prev, sayfa: page === 0 ? undefined : page + 1 }), resetScroll: false });
    document.getElementById("catalog-results")?.scrollIntoView({ block: "start" });
  };
  const filterClass = "h-11 w-full min-w-0 rounded-lg border bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-65";
  const selectedCategoryTitle = category
    ? category.parent_id && group ? `${group.name} · ${categoryLabel(category)}` : categoryLabel(category)
    : undefined;
  const title = [brand?.name, selectedCategoryTitle].filter(Boolean).join(" · ") || "Tüm ürünler";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
      <header className="rounded-xl border-s-4 border-highlight bg-ink p-5 text-ink-foreground sm:p-8">
        <nav aria-label="Sayfa konumu" className="mb-3 flex items-center gap-1.5 text-sm text-ink-foreground/85">
          <Link to="/" className="underline-offset-4 hover:underline">Ana sayfa</Link>
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
          <span aria-current="page">Ürün kataloğu</span>
        </nav>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}{brand && !category ? " ürünleri" : ""}</h1>
          {result && <p className="text-sm font-medium text-ink-foreground/85">{total.toLocaleString("tr-TR")} ürün</p>}
        </div>
      </header>
      <section aria-labelledby="catalog-filters-title" className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h2 id="catalog-filters-title" className="flex items-center gap-2 text-base font-bold"><SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-primary" />Ürün filtreleri</h2>
          {(s.marka || s.kategori || s.q) && <Button variant="ghost" size="sm" onClick={() => navigate({ search: {}, resetScroll: false })}>Tüm filtreleri temizle</Button>}
        </div>
        <div className={`grid grid-cols-2 gap-3 ${subcategories.length ? "lg:grid-cols-[2fr_1fr_1fr_1fr]" : "lg:grid-cols-[2fr_1fr_1fr]"}`}>
          <div className="col-span-2 min-w-0 space-y-1.5 lg:col-span-1">
            <Label htmlFor="catalog-search">Katalogda ara</Label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="catalog-search" type="search" placeholder="KM No, OEM veya ürün adı" value={s.q ?? ""} maxLength={200} className="h-11 rounded-lg bg-card pl-9 shadow-none" onChange={(event) => set({ q: event.target.value || undefined })} />
            </div>
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="catalog-main-group">Ana ürün grubu</Label>
            <select id="catalog-main-group" value={group?.slug ?? ""} disabled={!data} className={filterClass} onChange={(event) => void set({ kategori: event.target.value || undefined })}>
              <option value="">Tüm ana gruplar</option>
              {groups.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
          </div>
          {subcategories.length > 0 && <div className="min-w-0 space-y-1.5">
            <Label htmlFor="catalog-category">{group?.slug === "klips" ? "KLİPS türü / kullanım yeri" : "Alt kategori"}</Label>
            <select id="catalog-category" value={category?.parent_id ? category.slug : ""} disabled={!data} className={filterClass} onChange={(event) => void set({ kategori: event.target.value || group?.slug })}>
              <option value="">Tüm alt kategoriler</option>
              {subcategories.map((item) => <option key={item.id} value={item.slug}>{categoryLabel(item)}</option>)}
            </select>
          </div>}
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="catalog-brand">Araç markası</Label>
            <select id="catalog-brand" value={s.marka ?? ""} disabled={!data} className={filterClass} onChange={(event) => void set({ marka: event.target.value || undefined })}>
              <option value="">Tüm markalar</option>
              {data?.brands.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
          </div>
        </div>
        {filtersFailed && <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 text-sm"><p>Filtreler yüklenemedi.</p><Button variant="outline" size="sm" onClick={() => void refetchFilters()}>Tekrar dene</Button></div>}
      </section>
      <section id="catalog-results" aria-label="Katalog sonuçları" className="min-w-0 scroll-mt-32 lg:scroll-mt-24">
        {isError ? <div role="alert" className="space-y-3 rounded-xl border bg-card p-8 text-center"><p>Katalog yüklenemedi.</p><Button variant="outline" onClick={() => void refetch()}>Tekrar dene</Button></div> : isLoading ? <p role="status" className="text-muted-foreground">Ürünler yükleniyor…</p> : list.length === 0 ? <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Bu kriterlere uygun ürün bulunamadı.</p> : (
          <>
            <div className="mb-4"><Pager page={paginated.page - 1} total={total} pageSize={CATALOG_PAGE_SIZE} onChange={changePage} /></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{paginated.items.map((product) => <ProductCard key={product.id} p={product} />)}</div>
            <div className="mt-6"><Pager page={paginated.page - 1} total={total} pageSize={CATALOG_PAGE_SIZE} onChange={changePage} /></div>
          </>
        )}
      </section>
    </div>
  );
}
