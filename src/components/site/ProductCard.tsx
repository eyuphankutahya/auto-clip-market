import { Link } from "@tanstack/react-router";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";
import type { CatalogProduct } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { discounted, money } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function ProductCard({ p }: { p: CatalogProduct }) {
  const { add } = useCart();
  const { account } = useAuth();
  const rate = account ? Number(account.discount_rate) : 0;
  const price = discounted(Number(p.price), rate);
  const brands = [...new Set(p.vehicles.map((v) => v.brand?.name).filter(Boolean))];
  return (
    <div className="group flex flex-col overflow-hidden rounded-md border bg-card transition hover:border-accent hover:shadow-md">
      <Link to="/urun/$slug" params={{ slug: p.slug }} className="grid aspect-[4/3] place-items-center bg-secondary">
        {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-12 w-12 text-muted-foreground" />}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-accent">{p.category?.name}</div>
        <Link to="/urun/$slug" params={{ slug: p.slug }} className="font-display font-bold leading-tight hover:text-accent">{p.name}</Link>
        <div className="flex flex-wrap gap-1">
          {p.oems.slice(0, 3).map((o) => <span key={o.id} className="font-oem rounded-sm bg-secondary px-1.5 py-0.5 text-[11px]">OEM {o.oem}</span>)}
        </div>
        {brands.length > 0 && <div className="text-xs text-muted-foreground">{brands.join(" · ")}</div>}
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            {rate > 0 && <div className="text-xs text-muted-foreground line-through">{money(p.price)}</div>}
            <div className="font-display text-lg font-extrabold">{money(price)}</div>
            <div className={p.stock > 0 ? "text-xs text-success" : "text-xs text-destructive"}>{p.stock > 0 ? "Stokta" : "Stok yok"}</div>
          </div>
          <Button size="sm" disabled={p.stock <= 0} onClick={() => { add({ product_id: p.id, name: p.name, price: Number(p.price) }); toast.success("Sepete eklendi"); }}>
            <Plus className="h-4 w-4" />Sepet
          </Button>
        </div>
      </div>
    </div>
  );
}
