import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, Building2, CarFront, ChevronDown, ChevronRight, CircleDot, DoorOpen, Layers, Package, Search, Shield } from "lucide-react";
import { useState } from "react";
import hero from "@/assets/hero-clips.jpg";
import { catalogFiltersQuery, catalogPageQuery } from "@/lib/catalog-page";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const categoryIcons = new Map<string, typeof Package>([
  ["kapi-doseme", DoorOpen],
  ["tampon", CarFront],
  ["camurluk", CircleDot],
  ["tavan-bagaj-doseme", Briefcase],
  ["motor-alti", Shield],
  ["cita", Layers],
]);
const categoryPriority = [...categoryIcons.keys()];
const categoryPreviewSize = 6;
const categoryRank = (slug: string) => {
  const index = categoryPriority.indexOf(slug);
  return index < 0 ? categoryPriority.length : index;
};

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
  const filters = useQuery(catalogFiltersQuery);
  const productPage = useQuery(catalogPageQuery());
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [allCategories, setAllCategories] = useState(false);
  const navigate = useNavigate();
  const categories = [...(filters.data?.categories ?? [])].sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug));
  const visibleCategories = allCategories ? categories : categories.slice(0, categoryPreviewSize);
  const brands = filters.data?.brands ?? [];
  const products = [...(productPage.data?.products ?? [])].sort((a, b) =>
    Number(Boolean(b.image_thumbnail_url || b.image_url)) - Number(Boolean(a.image_thumbnail_url || a.image_url))).slice(0, 8);
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-5 sm:space-y-10 sm:px-6 sm:py-8">
      <section aria-labelledby="home-title">
        <div className="relative isolate overflow-hidden rounded-2xl bg-ink text-ink-foreground">
          <img src={hero} alt="" width={1600} height={912} fetchPriority="high" className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-[62%_center] brightness-125 md:w-[58%]" />
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-ink/85 md:bg-transparent md:bg-linear-to-r md:from-ink md:from-36% md:via-ink/60 md:via-53% md:to-transparent md:to-78%" />
          <div className="px-6 pt-10 pb-16 sm:px-10 sm:pt-12 sm:pb-19 lg:px-14 lg:pt-16 lg:pb-23">
            <h1 id="home-title" className="max-w-[15ch] text-4xl font-extrabold leading-[1.04] tracking-tight text-balance sm:text-5xl lg:text-6xl">Oto klips ve bağlantı elemanları</h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-foreground/85 sm:text-lg">Perakende ve toplu alım için araç markasına ve kullanım yerine göre ürün kataloğu.</p>
            <Link to="/urunler" search={{}} className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-semibold text-ink-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
              Tüm ürünleri incele <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="relative mx-3 -mt-7 rounded-xl border bg-card p-3 shadow-lg shadow-ink/10 sm:mx-8 sm:p-4 lg:mx-12 lg:-mt-8 lg:px-5">
          <form role="search" onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: "/urunler", search: { q: q.trim() || undefined } });
          }} className="space-y-2 sm:flex sm:items-center sm:gap-4 sm:space-y-0">
            <Label htmlFor="home-product-search" className="flex gap-2 px-1 font-semibold sm:px-0 sm:text-base">
              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />Katalogda ürün ara
            </Label>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Input id="home-product-search" type="search" name="q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} placeholder="KM No, OEM no veya ürün adı" className="h-11 min-w-0 flex-1 bg-background pl-3 shadow-none" />
              <Button type="submit" size="lg" className="h-11 shrink-0 px-4 sm:px-7">Ara <ArrowRight aria-hidden="true" className="hidden sm:block" /></Button>
            </div>
          </form>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-5">
        <section aria-labelledby="home-categories" className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          <h2 id="home-categories" className="text-xl font-extrabold sm:text-2xl">Kullanım yerine göre</h2>
          {filters.data ? (
            categories.length ? <>
              <ul id="home-category-list" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {visibleCategories.map((category) => {
                  const Icon = categoryIcons.get(category.slug) ?? Package;
                  return (
                    <li key={category.id} className="min-w-0">
                      <Link to="/urunler" search={{ kategori: category.slug }} className="group flex h-full min-h-19 min-w-0 items-center gap-2 rounded-lg border bg-card px-2.5 py-3 text-sm font-semibold transition hover:border-accent/70 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:gap-3 sm:px-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:h-10 sm:w-10"><Icon aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" /></span>
                        <span className="min-w-0 break-words leading-snug">{category.slug === "camurluk" ? "Çamurluk / Davlumbaz" : category.name}</span>
                        <ChevronRight aria-hidden="true" className="ml-auto hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 xl:block" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {categories.length > categoryPreviewSize && <Button type="button" variant="ghost" size="sm" aria-expanded={allCategories} aria-controls="home-category-list" className="mt-3 text-primary" onClick={() => setAllCategories((expanded) => !expanded)}>
                {allCategories ? "Daha az kategori göster" : `Tüm kategorileri göster (${categories.length})`}
                <ChevronDown aria-hidden="true" className={allCategories ? "rotate-180" : undefined} />
              </Button>}
            </> : <p className="mt-4 text-sm text-muted-foreground">Henüz kategori bulunmuyor.</p>
          ) : filters.isError ? (
            <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm"><p>Kategoriler ve markalar yüklenemedi.</p><Button type="button" size="sm" variant="outline" onClick={() => void filters.refetch()}>Tekrar dene</Button></div>
          ) : (
            <div role="status" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <span className="sr-only">Kategoriler yükleniyor…</span>
              {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-18 rounded-lg" />)}
            </div>
          )}
        </section>
        <section aria-labelledby="home-brands" className="rounded-xl border bg-linear-to-br from-secondary to-card p-4 shadow-sm sm:p-6">
          <span className="mb-3 grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-card text-primary"><CarFront aria-hidden="true" className="h-5 w-5" /></span>
          <h2 id="home-brands" className="text-lg font-extrabold">Araç markasına göre</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (brand && brands.some((entry) => entry.slug === brand)) void navigate({ to: "/urunler", search: { marka: brand } });
          }} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="home-brand">Araç markası</Label>
              <select id="home-brand" value={brand} onChange={(e) => setBrand(e.target.value)} disabled={!brands.length} className="h-11 w-full rounded-md border bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-65">
                <option value="">{filters.data ? (brands.length ? "Marka seçin" : "Marka bulunamadı") : filters.isError ? "Markalar yüklenemedi" : "Markalar yükleniyor…"}</option>
                {brands.map((entry) => <option key={entry.id} value={entry.slug}>{entry.name}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={!brand || !brands.length}>Ürünleri göster <ArrowRight aria-hidden="true" /></Button>
          </form>
        </section>
      </div>

      <section aria-labelledby="home-products" className="border-t pt-6 sm:pt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="home-products" className="text-xl font-extrabold sm:text-2xl">Katalogdan ürünler</h2>
          <Link to="/urunler" search={{}} className="inline-flex min-h-9 items-center gap-1.5 rounded-sm text-sm font-semibold text-primary hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Tüm ürünler <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
        {productPage.data ? (
          products.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} p={product} />)}</div>
            : <p className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Katalogda henüz ürün bulunmuyor.</p>
        ) : productPage.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-5 text-sm"><p>Ürünler yüklenemedi.</p><Button type="button" size="sm" variant="outline" onClick={() => void productPage.refetch()}>Tekrar dene</Button></div>
        ) : (
          <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <span className="sr-only">Ürünler yükleniyor…</span>
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-56 rounded-lg" />)}
          </div>
        )}
      </section>

      <section aria-labelledby="home-wholesale" className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-ink p-5 text-ink-foreground sm:p-7">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-foreground/10 text-ink-foreground"><Building2 aria-hidden="true" className="h-5 w-5" /></span>
          <div>
            <h2 id="home-wholesale" className="text-lg font-extrabold">Toplu alım ve cari hesap</h2>
            <p className="mt-1 text-sm text-ink-foreground/80">Firmanız için ürün, adet ve fiyat taleplerinizi iletin.</p>
          </div>
        </div>
        <Button asChild variant="secondary"><Link to="/iletisim" hash="mesaj">Talep oluştur <ArrowRight aria-hidden="true" /></Link></Button>
      </section>
    </div>
  );
}
