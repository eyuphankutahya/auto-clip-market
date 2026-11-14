import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { catalogFiltersQuery, catalogPageQuery } from "@/lib/catalog-page";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/site/ProductCard";
import { Input } from "@/components/ui/input";
import { Pager } from "@/components/site/Pager";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog-pagination";

const search = z.object({ q: z.string().max(200).optional(), kategori: z.string().max(200).optional(), marka: z.string().max(200).optional(), model: z.string().max(200).optional(), sayfa: z.coerce.number().int().min(1).catch(1).optional() });

export const Route = createFileRoute("/urunler")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Tüm Klipsler — KlipsMarket" },
      { name: "description", content: "Kategori, araç markası ve modele göre filtrelenebilir oto klips kataloğu." },
      { property: "og:title", content: "Tüm Klipsler — KlipsMarket" },
      { property: "og:description", content: "OEM numarası, kategori ve araç markasıyla filtreleyin." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Products,
});

function Products() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/urunler" });
  const set = (patch: Partial<z.infer<typeof search>>) => navigate({ search: (prev) => ({ ...prev, ...patch, sayfa: undefined }) });
  const { data } = useQuery(catalogFiltersQuery);
  const { data: result, isLoading } = useQuery(catalogPageQuery(s));
  const brand = data?.brands.find((b) => b.slug === s.marka);
  const category = data?.categories.find((c) => c.slug === s.kategori);
  const list = result?.products ?? [];
  const total = result?.total ?? 0;
  const paginated = { page: result?.page ?? 1, items: list };
  const changePage = (page: number) => {
    void navigate({ search: (prev) => ({ ...prev, sayfa: page === 0 ? undefined : page + 1 }), resetScroll: false });
    document.getElementById("catalog-results")?.scrollIntoView({ block: "start" });
  };
  const chip = (active: boolean) => `block w-full rounded-sm px-2 py-1.5 text-left text-sm ${active ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"}`;
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[240px_1fr]">
      <aside className="space-y-6">
        <Input placeholder="KM No / OEM no / ürün adı" defaultValue={s.q} className="font-oem" onChange={(e) => set({ q: e.target.value || undefined })} />
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Kullanım yeri</h3>
          <Button variant="ghost" className={chip(!s.kategori)} onClick={() => set({ kategori: undefined })}>Tümü</Button>
          {data?.categories.map((c) => <Button variant="ghost" key={c.id} className={`${chip(s.kategori === c.slug)} h-auto justify-start whitespace-normal`} onClick={() => set({ kategori: c.slug })}>{c.slug === "camurluk" ? "Çamurluk / Davlumbaz Klipsleri" : c.name}</Button>)}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Araç markası</h3>
          <Button variant="ghost" className={chip(!s.marka)} onClick={() => set({ marka: undefined, model: undefined })}>Tümü</Button>
          {data?.brands.map((b) => (
            <div key={b.id}>
              <Button variant="ghost" className={chip(s.marka === b.slug)} onClick={() => set({ marka: b.slug, model: undefined })}>{b.name}</Button>
              {s.marka === b.slug && (
                <div className="ml-3 border-l pl-2">
                  {data.models.filter((m) => m.brand_id === b.id).map((m) => (
                    <Button variant="ghost" key={m.id} className={chip(s.model === m.id)} onClick={() => set({ model: s.model === m.id ? undefined : m.id })}>{m.name}</Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
      <section id="catalog-results" className="min-w-0 scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{[brand?.name, category?.slug === "camurluk" ? "Çamurluk / Davlumbaz Klipsleri" : category?.name].filter(Boolean).join(" · ") || "Tüm ürünler"}{brand && !category ? " klipsleri" : ""}</h1>
          <span className="text-sm text-muted-foreground">{total} ürün</span>
        </div>
        {(s.marka || s.kategori || s.model || s.q) && <Button variant="outline" size="sm" className="mb-4" onClick={() => navigate({ search: {} })}>Tüm filtreleri temizle</Button>}
        {isLoading ? <p className="text-muted-foreground">Yükleniyor…</p> : list.length === 0 ? <p className="rounded-md border bg-card p-8 text-center text-muted-foreground">Bu kriterlere uygun ürün bulunamadı.</p> : (
          <>
            <div className="mb-4"><Pager page={paginated.page - 1} total={total} pageSize={CATALOG_PAGE_SIZE} onChange={changePage} /></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paginated.items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
            <div className="mt-6"><Pager page={paginated.page - 1} total={total} pageSize={CATALOG_PAGE_SIZE} onChange={changePage} /></div>
          </>
        )}
      </section>
    </div>
  );
}
