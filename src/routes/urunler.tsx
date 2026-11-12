import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { catalogQuery } from "@/lib/catalog";
import { ProductCard } from "@/components/site/ProductCard";
import { Input } from "@/components/ui/input";

const search = z.object({ q: z.string().optional(), kategori: z.string().optional(), marka: z.string().optional(), model: z.string().optional() });

export const Route = createFileRoute("/urunler")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Tüm Klipsler — KlipsMarket" },
      { name: "description", content: "Kategori, araç markası ve modele göre filtrelenebilir oto klips kataloğu." },
      { property: "og:title", content: "Tüm Klipsler — KlipsMarket" },
      { property: "og:description", content: "OEM numarası, kategori ve araç markasıyla filtreleyin." },
    ],
  }),
  component: Products,
});

function Products() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/urunler" });
  const set = (patch: Partial<z.infer<typeof search>>) => navigate({ search: (prev) => ({ ...prev, ...patch }) });
  const { data, isLoading } = useQuery(catalogQuery);
  const brand = data?.brands.find((b) => b.slug === s.marka);
  const q = s.q?.toLowerCase().replace(/[\s-]/g, "");
  const list = (data?.products ?? []).filter((p) => {
    if (s.kategori && p.category?.slug !== s.kategori) return false;
    if (brand && !p.vehicles.some((v) => v.brand_id === brand.id)) return false;
    if (s.model && !p.vehicles.some((v) => v.model_id === s.model || (v.brand_id === brand?.id && !v.model_id))) return false;
    if (q && !p.name.toLowerCase().replace(/[\s-]/g, "").includes(q) && !p.oems.some((o) => o.oem.toLowerCase().replace(/[\s-]/g, "").includes(q))) return false;
    return true;
  });
  const chip = (active: boolean) => `block w-full rounded-sm px-2 py-1.5 text-left text-sm ${active ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-secondary"}`;
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[240px_1fr]">
      <aside className="space-y-6">
        <Input placeholder="OEM no / ürün adı" defaultValue={s.q} className="font-oem" onChange={(e) => set({ q: e.target.value || undefined })} />
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Kullanım yeri</h3>
          <button className={chip(!s.kategori)} onClick={() => set({ kategori: undefined })}>Tümü</button>
          {data?.categories.map((c) => <button key={c.id} className={chip(s.kategori === c.slug)} onClick={() => set({ kategori: c.slug })}>{c.name}</button>)}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Araç markası</h3>
          <button className={chip(!s.marka)} onClick={() => set({ marka: undefined, model: undefined })}>Tümü</button>
          {data?.brands.map((b) => (
            <div key={b.id}>
              <button className={chip(s.marka === b.slug)} onClick={() => set({ marka: b.slug, model: undefined })}>{b.name}</button>
              {s.marka === b.slug && (
                <div className="ml-3 border-l pl-2">
                  {data.models.filter((m) => m.brand_id === b.id).map((m) => (
                    <button key={m.id} className={chip(s.model === m.id)} onClick={() => set({ model: s.model === m.id ? undefined : m.id })}>{m.name}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-2xl font-extrabold">{brand ? `${brand.name} klipsleri` : "Tüm ürünler"}</h1>
          <span className="text-sm text-muted-foreground">{list.length} ürün</span>
        </div>
        {isLoading ? <p className="text-muted-foreground">Yükleniyor…</p> : list.length === 0 ? <p className="rounded-md border bg-card p-8 text-center text-muted-foreground">Bu kriterlere uygun ürün bulunamadı.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </section>
    </div>
  );
}
