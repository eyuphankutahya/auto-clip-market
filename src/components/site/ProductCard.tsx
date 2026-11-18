import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { CatalogProduct } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { discounted, isOrderable, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/site/ProductImage";

export function ProductCard({ p }: { p: CatalogProduct }) {
  const { add } = useCart();
  const { account } = useAuth();
  const rate = account ? Number(account.discount_rate) : 0;
  const price = discounted(Number(p.price), rate);
  const brands = [...new Set(p.vehicles.map((v) => v.brand?.name).filter(Boolean))];
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition hover:border-primary/45 hover:shadow-md">
      <ProductImage src={p.image_thumbnail_url ?? p.image_url} original={p.image_original_url ?? p.image_url} name={p.name} />
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
          {p.category && <span className="font-medium text-primary">{p.category.name}</span>}
          {p.sku && <span className="font-oem ml-auto text-muted-foreground">KM No {p.sku}</span>}
        </div>
        <Link to="/urun/$slug" params={{ slug: p.slug }} className="font-display rounded-sm font-bold leading-snug wrap-break-word underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">{p.name}</Link>
        {p.oems.length > 0 && <div className="flex flex-wrap gap-1">
          {p.oems.slice(0, 3).map((o) => <span key={o.id} className="font-oem rounded-sm bg-secondary px-1.5 py-0.5 text-[11px]">OEM {o.oem}</span>)}
        </div>}
        {brands.length > 0 && <div className="text-xs text-muted-foreground">{brands.join(" · ")}</div>}
        {p.package_quantity !== null && <div className="text-xs text-muted-foreground">Paket içi: {p.package_quantity} adet</div>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t pt-3">
          <div>
            {Number(p.price) > 0 ? (<>
              {rate > 0 && <div className="text-xs text-muted-foreground line-through">{money(p.price)}</div>}
              <div className="font-display text-lg font-extrabold">{money(price)}</div>
            </>) : <div className="font-display text-sm font-bold text-muted-foreground">Fiyat yakında</div>}
            <div className={p.stock > 0 ? "text-xs font-medium text-emerald-800" : "text-xs font-medium text-destructive"}>{p.stock > 0 ? "Stokta" : "Stok yok"}</div>
          </div>
          <Button size="sm" className="min-h-10 rounded-lg" aria-label={`${p.name} sepete ekle`} disabled={!isOrderable(p.price, p.stock)} onClick={() => { if (add({ product_id: p.id, name: p.name, sku: p.sku, price: Number(p.price), stock: p.stock })) toast.success("Sepete eklendi"); else toast.error(`Stokta en fazla ${p.stock} adet var`); }}>
            <ShoppingCart aria-hidden="true" className="h-4 w-4" />Sepete ekle
          </Button>
        </div>
      </div>
    </article>
  );
}
