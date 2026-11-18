import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
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
    <div className="group flex flex-col overflow-hidden rounded-md border bg-card transition hover:border-accent hover:shadow-md">
      <ProductImage src={p.image_thumbnail_url ?? p.image_url} original={p.image_original_url ?? p.image_url} name={p.name} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium uppercase tracking-wide text-accent">{p.category?.name}</span>
          {p.sku && <span className="font-oem shrink-0 text-muted-foreground">KM No {p.sku}</span>}
        </div>
        <Link to="/urun/$slug" params={{ slug: p.slug }} className="font-display font-bold leading-tight hover:text-accent">{p.name}</Link>
        <div className="flex flex-wrap gap-1">
          {p.oems.slice(0, 3).map((o) => <span key={o.id} className="font-oem rounded-sm bg-secondary px-1.5 py-0.5 text-[11px]">OEM {o.oem}</span>)}
        </div>
        {brands.length > 0 && <div className="text-xs text-muted-foreground">{brands.join(" · ")}</div>}
        {p.package_quantity !== null && <div className="text-xs text-muted-foreground">Paket içi: {p.package_quantity} adet</div>}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {Number(p.price) > 0 ? (<>
              {rate > 0 && <div className="text-xs text-muted-foreground line-through">{money(p.price)}</div>}
              <div className="font-display text-lg font-extrabold">{money(price)}</div>
            </>) : <div className="font-display text-sm font-bold text-muted-foreground">Fiyat yakında</div>}
            <div className={p.stock > 0 ? "text-xs text-success" : "text-xs text-destructive"}>{p.stock > 0 ? "Stokta" : "Stok yok"}</div>
          </div>
          <Button size="sm" disabled={!isOrderable(p.price, p.stock)} onClick={() => { if (add({ product_id: p.id, name: p.name, sku: p.sku, price: Number(p.price), stock: p.stock })) toast.success("Sepete eklendi"); else toast.error(`Stokta en fazla ${p.stock} adet var`); }}>
            <Plus className="h-4 w-4" />Sepet
          </Button>
        </div>
      </div>
    </div>
  );
}
