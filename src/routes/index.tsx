import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import hero from "@/assets/hero-clips.jpg";
import { catalogFiltersQuery, catalogPageQuery } from "@/lib/catalog-page";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KlipsMarket — OEM Numarası ile Oto Klips Bul" },
      { name: "description", content: "Kapı döşeme, tampon, çamurluk ve daha fazlası. OEM numarası veya araç markasıyla klips arayın." },
      { property: "og:title", content: "KlipsMarket — OEM Numarası ile Oto Klips Bul" },
      { property: "og:description", content: "Kullanım yerine ve araç markasına göre listelenmiş oto klips çeşitleri." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data } = useQuery(catalogFiltersQuery);
  const { data: page } = useQuery(catalogPageQuery());
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  return (
    <div>
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img src={hero} alt="" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-warning">Toptan & perakende</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.05] md:text-6xl">Doğru klipsi OEM numarasıyla bulun.</h1>
          <p className="mt-4 max-w-xl text-lg opacity-80">Kullanım yerine ve araç markasına göre listelenmiş yüzlerce bağlantı elemanı.</p>
          <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/urunler", search: { q: q || undefined } }); }} className="mt-8 flex max-w-xl gap-2 rounded-md bg-card p-2 shadow-xl">
            <div className="flex flex-1 items-center gap-2 px-2 text-foreground">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="KM No, OEM no veya ürün adı (örn. 7703077469)" className="font-oem w-full bg-transparent py-2 outline-none placeholder:font-sans" />
            </div>
            <Button type="submit" size="lg">Ara</Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <h2 className="mb-6 text-2xl font-extrabold">Kullanım yerine göre</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {data?.categories.map((c) => (
            <Link key={c.id} to="/urunler" search={{ kategori: c.slug }} className="rounded-md border bg-card p-4 font-display font-bold transition hover:border-accent hover:text-accent">
              {c.slug === "camurluk" ? "Çamurluk / Davlumbaz Klipsleri" : c.name}
              
            </Link>
          ))}
        </div>

        <h2 className="mb-6 mt-14 text-2xl font-extrabold">Araç markasına göre</h2>
        <div className="flex flex-wrap gap-2">
          {data?.brands.map((b) => (
            <Link key={b.id} to="/urunler" search={{ marka: b.slug }} className="rounded-sm border bg-card px-4 py-2 text-sm font-semibold hover:border-accent hover:bg-accent hover:text-accent-foreground">{b.name}</Link>
          ))}
        </div>

        <div className="mb-6 mt-14 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">Ürünler</h2>
          <Link to="/urunler" search={{}} className="text-sm font-semibold text-accent">Tümünü gör →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {page?.products.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </div>
  );
}
