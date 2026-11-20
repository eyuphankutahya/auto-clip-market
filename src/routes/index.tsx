import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Briefcase, Building2, CarFront, ChevronDown, ChevronRight, CircleDot, Disc3, DoorOpen, Droplets, Layers, Package, PlugZap, Search, Shield } from "lucide-react";
import { useState } from "react";
import hero from "@/assets/hero-clips.jpg";
import { catalogFiltersQuery, catalogPageQuery } from "@/lib/catalog-page";
import { categoryLabel, childCategories, mainCategories } from "@/lib/catalog-groups";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const mainGroupIcons = new Map<string, typeof Package>([
  ["klips", Layers],
  ["soket", PlugZap],
  ["jant-kapagi", CircleDot],
  ["celik-jant-gobekleri", Disc3],
  ["oto-bakim-malzemeleri-kimyasallari", Droplets],
]);
const subcategoryIcons = new Map<string, typeof Package>([
  ["kapi-doseme", DoorOpen],
  ["tampon", CarFront],
  ["camurluk", CircleDot],
  ["tavan-bagaj-doseme", Briefcase],
  ["motor-alti", Shield],
  ["cita", Layers],
]);
const categoryPriority = [...subcategoryIcons.keys()];
const categoryPreviewSize = 6;
const categoryRank = (slug: string) => {
  const index = categoryPriority.indexOf(slug);
  return index < 0 ? categoryPriority.length : index;
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KlipsMarket — Oto Klips, Jant ve Bakım Ürünleri" },
      { name: "description", content: "Klips, soket, jant kapağı, çelik jant göbeği ve oto bakım ürünlerini OEM numarası veya araç markasıyla bulun." },
      { property: "og:title", content: "KlipsMarket — Oto Klips, Jant ve Bakım Ürünleri" },
      { property: "og:description", content: "Beş ana ürün grubunda OEM numarasına, kullanım yerine ve araç markasına göre ürün arayın." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const allCategoriesData = filters.data?.categories ?? [];
  const groups = mainCategories(allCategoriesData);
  const clipGroup = groups.find((group) => group.slug === "klips");
  const clipCategories = childCategories(allCategoriesData, clipGroup?.id).sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug));
  const visibleCategories = allCategories ? clipCategories : clipCategories.slice(0, categoryPreviewSize);
  const brands = filters.data?.brands ?? [];
  const products = [...(productPage.data?.products ?? [])].sort((a, b) =>
    Number(Boolean(b.image_thumbnail_url || b.image_url)) - Number(Boolean(a.image_thumbnail_url || a.image_url))).slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-5 sm:space-y-14 sm:px-6 sm:py-8">
      <section aria-labelledby="home-title" className="relative isolate overflow-hidden rounded-2xl bg-[#0c182d] text-white shadow-lg shadow-ink/15">
        <img src={hero} alt="" width={1600} height={912} fetchPriority="high" className="absolute right-0 top-0 -z-20 h-52 w-full object-cover object-[65%_44%] brightness-150 sm:h-60 lg:h-full lg:w-[62%]" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-b from-transparent from-10% via-[#0c182d] via-43% to-[#0c182d] lg:bg-linear-to-r lg:from-[#0c182d] lg:from-37% lg:via-[#0c182d]/60 lg:via-56% lg:to-transparent lg:to-79%" />
        <div className="px-5 pb-7 pt-26 sm:px-10 sm:pb-10 sm:pt-30 lg:px-12 lg:py-16 xl:px-16">
          <h1 id="home-title" className="max-w-[18ch] text-[clamp(2rem,6.2vw,4rem)] font-extrabold leading-[1.04] tracking-tight">
            Oto klips, jant ve <span className="block text-highlight">bakım ürünleri</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-200 sm:text-base">
            KLİPS, soket, jant kapağı, çelik jant göbeği ve oto bakım ürünlerini tek katalogda bulun.
          </p>
          <form role="search" action="/urunler" method="get" onSubmit={(event) => {
            event.preventDefault();
            void navigate({ to: "/urunler", search: { q: q.trim() || undefined } });
          }} className="mt-6 max-w-lg">
            <Label htmlFor="home-product-search" className="sr-only">Katalogda ürün ara</Label>
            <div className="flex min-w-0 items-center gap-1 rounded-xl bg-card p-1.5 text-foreground shadow-xl shadow-black/15 sm:gap-2">
              <Search aria-hidden="true" className="ml-2 h-5 w-5 shrink-0 text-primary" />
              <Input id="home-product-search" type="search" name="q" value={q} onChange={(event) => setQ(event.target.value)} maxLength={200} placeholder="KM No, OEM veya ürün adı" className="h-11 min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none sm:px-2" />
              <Button type="submit" size="lg" className="h-11 shrink-0 rounded-lg bg-highlight px-4 text-ink hover:bg-highlight/85 sm:px-6">Ara <ArrowRight aria-hidden="true" className="hidden sm:block" /></Button>
            </div>
          </form>
          <Link to="/urunler" search={{}} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-white underline-offset-4 hover:text-highlight hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-highlight">
            Tüm ürünleri incele <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="space-y-5">
        <section aria-labelledby="home-categories">
          <h2 id="home-categories" className="text-2xl font-extrabold tracking-tight sm:text-[2rem]">Ana ürün grupları</h2>
          {filters.data ? (
            groups.length ? <>
              <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
                {groups.map((group) => {
                  const Icon = mainGroupIcons.get(group.slug) ?? Package;
                  return <li key={group.id} className="min-w-0">
                    <Link to="/urunler" search={{ kategori: group.slug }} className="group flex h-full min-h-32 min-w-0 flex-col items-start justify-between gap-3 rounded-xl border bg-card p-4 text-sm font-semibold shadow-xs transition hover:border-primary/55 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-highlight group-hover:text-ink"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                      <span className="flex w-full items-center justify-between gap-1.5">
                        <span className="min-w-0 break-words leading-snug">{group.name}</span>
                        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                      </span>
                    </Link>
                  </li>;
                })}
              </ul>
              {clipGroup && <div className="mt-7 rounded-xl border bg-secondary/45 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-extrabold">KLİPS kullanım yerleri</h3>
                  <Link to="/urunler" search={{ kategori: clipGroup.slug }} className="text-sm font-semibold text-primary hover:underline">Tüm klipsleri göster</Link>
                </div>
                <ul id="home-category-list" className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                  {visibleCategories.map((category) => {
                    const Icon = subcategoryIcons.get(category.slug) ?? Package;
                    return <li key={category.id} className="min-w-0">
                      <Link to="/urunler" search={{ kategori: category.slug }} className="group flex h-full min-h-24 min-w-0 flex-col items-start justify-between gap-2 rounded-lg border bg-card p-3 text-sm font-semibold shadow-xs transition hover:border-primary/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <Icon aria-hidden="true" className="h-[1.125rem] w-[1.125rem] text-primary" />
                        <span className="flex w-full items-center justify-between gap-1.5">
                          <span className="min-w-0 break-words leading-snug">{categoryLabel(category)}</span>
                          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </span>
                      </Link>
                    </li>;
                  })}
                </ul>
                {clipCategories.length > categoryPreviewSize && <Button type="button" variant="ghost" size="sm" aria-expanded={allCategories} aria-controls="home-category-list" className="mt-3 text-primary" onClick={() => setAllCategories((expanded) => !expanded)}>
                  {allCategories ? "Daha az kategori göster" : `Tüm KLİPS türlerini göster (${clipCategories.length})`}
                  <ChevronDown aria-hidden="true" className={allCategories ? "rotate-180" : undefined} />
                </Button>}
              </div>}
            </> : <p className="mt-4 text-sm text-muted-foreground">Henüz ana ürün grubu bulunmuyor.</p>
          ) : filters.isError ? (
            <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm"><p>Ürün grupları ve markalar yüklenemedi.</p><Button type="button" size="sm" variant="outline" onClick={() => void filters.refetch()}>Tekrar dene</Button></div>
          ) : (
            <div role="status" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <span className="sr-only">Ana ürün grupları yükleniyor…</span>
              {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)}
            </div>
          )}
        </section>
        <section aria-labelledby="home-brands" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-secondary p-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border bg-card text-primary"><CarFront aria-hidden="true" className="h-5 w-5" /></span>
            <h2 id="home-brands" className="text-lg font-extrabold">Araç markasına göre</h2>
          </div>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (brand && brands.some((entry) => entry.slug === brand)) void navigate({ to: "/urunler", search: { marka: brand } });
          }} className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
            <Label htmlFor="home-brand" className="sr-only">Araç markası</Label>
            <select id="home-brand" value={brand} onChange={(event) => setBrand(event.target.value)} disabled={!brands.length} className="h-11 min-w-0 flex-[1_1_10rem] rounded-lg border bg-card px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-65 sm:w-52 sm:flex-auto">
              <option value="">{filters.data ? (brands.length ? "Marka seçin" : "Marka bulunamadı") : filters.isError ? "Markalar yüklenemedi" : "Markalar yükleniyor…"}</option>
              {brands.map((entry) => <option key={entry.id} value={entry.slug}>{entry.name}</option>)}
            </select>
            <Button type="submit" className="h-11 grow rounded-lg sm:grow-0" disabled={!brand || !brands.length}>Ürünleri göster <ArrowRight aria-hidden="true" /></Button>
          </form>
        </section>
      </div>

      <section aria-labelledby="home-products">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="home-products" className="text-2xl font-extrabold tracking-tight sm:text-[2rem]">Katalogdan ürünler</h2>
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

      <section aria-labelledby="home-wholesale" className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-s-4 border-highlight bg-ink p-5 text-ink-foreground sm:p-8">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink-foreground/10 text-highlight"><Building2 aria-hidden="true" className="h-5 w-5" /></span>
          <div>
            <h2 id="home-wholesale" className="text-lg font-extrabold">Toplu alım ve cari hesap</h2>
            <p className="mt-1 text-sm text-ink-foreground/80">Firmanız için ürün, adet ve fiyat taleplerinizi iletin.</p>
          </div>
        </div>
        <Button asChild className="h-11 rounded-lg bg-highlight text-ink hover:bg-highlight/85"><Link to="/iletisim" hash="mesaj">Talep oluştur <ArrowRight aria-hidden="true" /></Link></Button>
      </section>
    </div>
  );
}
