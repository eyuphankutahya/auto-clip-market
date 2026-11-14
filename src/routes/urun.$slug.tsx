import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { catalogQuery } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { discounted, isOrderable, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/urun/$slug")({
  head: () => ({
    meta: [
      { title: "Ürün Detayı — KlipsMarket" },
      { name: "description", content: "Klips detayları, OEM numaraları ve uyumlu araçlar." },
      { property: "og:title", content: "Ürün Detayı — KlipsMarket" },
      { property: "og:description", content: "OEM numaraları ve uyumlu araç listesi." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery(catalogQuery);
  const { add } = useCart();
  const { account } = useAuth();
  const [qty, setQty] = useState(1);
  const p = data?.products.find((x) => x.slug === slug);
  if (isLoading) return <p className="p-10 text-muted-foreground">Yükleniyor…</p>;
  if (!p) return <div className="p-10">Ürün bulunamadı. <Link to="/urunler" search={{}} className="text-accent">Ürünlere dön</Link></div>;
  const rate = account ? Number(account.discount_rate) : 0;
  const byBrand = new Map<string, string[]>();
  p.vehicles.forEach((v) => { const k = v.brand?.name ?? ""; byBrand.set(k, [...(byBrand.get(k) ?? []), v.model?.name ?? "Tüm modeller"]); });
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-2">
      <div className="grid aspect-square place-items-center rounded-md border bg-secondary">
        {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full rounded-md object-cover" /> : <Package className="h-24 w-24 text-muted-foreground" />}
      </div>
      <div>
        <Link to="/urunler" search={{ kategori: p.category?.slug }} className="text-sm font-semibold uppercase tracking-wide text-accent">{p.category?.name}</Link>
        <h1 className="mt-2 text-3xl font-extrabold">{p.name}</h1>
        {p.sku && <div className="font-oem mt-2 text-sm text-muted-foreground">KlipsMarket No: <span className="font-semibold text-foreground">{p.sku}</span></div>}
        <div className="mt-3 flex flex-wrap gap-2">{p.oems.map((o) => <span key={o.id} className="font-oem rounded-sm border bg-card px-2 py-1 text-sm">OEM {o.oem}</span>)}</div>
        {p.description && <p className="mt-5 text-muted-foreground">{p.description}</p>}
        <div className="mt-6">
          {Number(p.price) > 0 ? (<>
            {rate > 0 && <div className="text-sm text-muted-foreground"><span className="line-through">{money(p.price)}</span> · cari iskontonuz %{rate}</div>}
            <div className="font-display text-4xl font-extrabold">{money(discounted(Number(p.price), rate))}</div>
          </>) : <div className="font-display text-2xl font-extrabold text-muted-foreground">Fiyat yakında</div>}
          <div className={p.stock > 0 ? "text-sm text-success" : "text-sm text-destructive"}>{p.stock > 0 ? `Stokta (${p.stock} adet)` : "Stokta yok"}</div>
        </div>
        <div className="mt-6 flex gap-2">
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="w-28" />
          <Button size="lg" disabled={!isOrderable(p.price, p.stock)} onClick={() => { add({ product_id: p.id, name: p.name, price: Number(p.price) }, qty); toast.success("Sepete eklendi"); }}>Sepete ekle</Button>
        </div>
        <div className="mt-10">
          <h2 className="mb-3 text-lg font-extrabold">Uyumlu araçlar</h2>
          {byBrand.size === 0 ? <p className="text-sm text-muted-foreground">Belirtilmemiş.</p> : (
            <table className="w-full text-sm"><tbody>
              {[...byBrand].map(([b, ms]) => <tr key={b} className="border-b"><td className="py-2 pr-4 font-semibold">{b}</td><td className="py-2 text-muted-foreground">{ms.join(", ")}</td></tr>)}
            </tbody></table>
          )}
        </div>
      </div>
    </div>
  );
}
