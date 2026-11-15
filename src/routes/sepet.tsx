import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { discounted, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/sepet")({
  head: () => ({
    meta: [
      { title: "Sepetim — KlipsMarket" },
      { name: "description", content: "Sepetinizdeki klipsleri gözden geçirin ve sipariş talebi oluşturun." },
      { property: "og:title", content: "Sepetim — KlipsMarket" },
      { property: "og:description", content: "Sipariş talebi oluşturun." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Cart,
});

function Cart() {
  const { items, setQty, remove, clear } = useCart();
  const { user, account } = useAuth();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const navigate = useNavigate();
  const rate = account ? Number(account.discount_rate) : 0;
  // Always show current catalog prices/stock; the server recomputes prices again in place_order.
  const ids = items.map((i) => i.product_id).sort().join(",");
  const { data: live } = useQuery({ queryKey: ["cart-live", ids], enabled: items.length > 0, refetchOnWindowFocus: true, queryFn: async () => {
    const { data } = await supabase.from("products").select("id,price,stock,is_active").in("id", items.map((i) => i.product_id));
    return new Map((data ?? []).map((p) => [p.id, p]));
  } });
  const priceOf = (i: { product_id: string; price: number }) => { const p = live?.get(i.product_id); return p?.price != null ? Number(p.price) : i.price; };
  const changed = items.filter((i) => live?.has(i.product_id) && priceOf(i) !== i.price);
  const unavailable = live ? items.filter((i) => { const p = live.get(i.product_id); return !p || p.is_active === false || p.price == null || i.quantity > Number(p.stock); }) : [];
  const total = items.reduce((s, i) => s + discounted(priceOf(i), rate) * i.quantity, 0);
  const order = async () => {
    if(inFlight.current) return;
    inFlight.current = true; setBusy(true);
    const payload = JSON.stringify({items,notes});
    const stored = sessionStorage.getItem("order-request");
    let request: {payload:string;key:string} | null = null;
    try { request = stored ? JSON.parse(stored) : null; } catch { /* replace invalid key */ }
    const key = request?.payload === payload ? request.key : crypto.randomUUID();
    sessionStorage.setItem("order-request",JSON.stringify({payload,key}));
    let error: {message:string} | null = null;
    try { const result = await supabase.rpc("place_order_once", { _items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })), _notes: notes, _request_key:key }); error=result.error; }
    catch { error={message:"Sipariş yanıtı alınamadı; tekrar deneyebilirsiniz."}; }
    finally { setBusy(false); inFlight.current=false; }

    if (error) { toast.error(error.message); return; }
    sessionStorage.removeItem("order-request");
    clear();
    toast.success("Sipariş talebiniz alındı");
    navigate({ to: "/hesabim" });
  };
  if (items.length === 0) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-2xl font-extrabold">Sepetiniz boş</h1><Link to="/urunler" search={{}} className="mt-4 inline-block text-accent">Ürünlere göz atın →</Link></div>;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-extrabold">Sepetim</h1>
      <div className="divide-y rounded-md border bg-card">
        {items.map((i) => (
          <div key={i.product_id} className="flex items-center gap-4 p-4">
            <div className="flex-1 font-semibold">{i.name}<div className="text-sm font-normal text-muted-foreground">{money(discounted(priceOf(i), rate))} / adet{changed.includes(i) && <span className="ml-2 font-semibold text-accent">(fiyat güncellendi, eski: {money(discounted(i.price, rate))})</span>}{unavailable.includes(i) && <span className="ml-2 font-semibold text-destructive">(stok yetersiz / satışta değil)</span>}</div></div>
            <Input type="number" min={1} max={i.stock} value={i.quantity} onChange={(e) => setQty(i.product_id, Number(e.target.value))} className="w-24" />
            <div className="w-28 text-right font-bold">{money(discounted(priceOf(i), rate) * i.quantity)}</div>
            <button onClick={() => remove(i.product_id)} aria-label="Kaldır" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Textarea maxLength={2000} placeholder="Sipariş notu (isteğe bağlı)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="rounded-md border bg-card p-5">
          {rate > 0 && <div className="text-sm text-muted-foreground">Cari iskonto %{rate} uygulandı</div>}
          {changed.length > 0 && <div className="mb-2 rounded-md border border-accent/40 bg-accent/10 p-2 text-sm">Sepetinizdeki {changed.length} ürünün fiyatı değişti; toplam güncel fiyatlarla gösteriliyor.</div>}
          {unavailable.length > 0 && <div className="mb-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">Bazı ürünler stokta yeterli değil veya satışta değil; adetleri düzenleyin.</div>}
          <div className="flex justify-between font-display text-2xl font-extrabold"><span>Toplam</span><span>{money(total)}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">{account ? "Sipariş onaylandığında cari hesabınıza borç olarak yazılır." : "Online ödeme yoktur; siparişiniz onaylandıktan sonra sizinle iletişime geçilir."}</p>
          {user ? <Button className="mt-4 w-full" size="lg" disabled={busy || unavailable.length > 0} onClick={order}>Sipariş talebi gönder</Button>
            : <Link to="/auth"><Button className="mt-4 w-full" size="lg">Sipariş için giriş yapın</Button></Link>}
        </div>
      </div>
    </div>
  );
}
