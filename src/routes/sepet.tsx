import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { discounted, isOrderable, money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const cartDate = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });

function Cart() {
  const { items, setQty, remove, clear } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<{ id: string; orderNo?: number; createdAt?: string; total?: number } | null>(null);
  const inFlight = useRef(false);
  const ids = items.map((item) => item.product_id).sort();
  const tooManyItems = ids.length > 500;
  const { data: quote, isError, refetch } = useQuery({
    queryKey: ["cart-live", user?.id, ids],
    enabled: !authLoading && ids.length > 0 && !tooManyItems,
    queryFn: async () => {
      const productQueries = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) =>
        supabase.from("products").select("id,sku,price,stock,is_active").in("id", ids.slice(index * 100, (index + 1) * 100)));
      const [batches, account] = await Promise.all([
        Promise.all(productQueries),
        user ? supabase.from("customer_accounts").select("id,discount_rate").eq("user_id", user.id).maybeSingle() : null,
      ]);
      if (account?.error) throw new Error(account.error.message);
      const products = batches.flatMap((batch) => {
        if (batch.error) throw new Error(batch.error.message);
        return batch.data;
      });
      return { products: new Map(products.map((product) => [product.id, product])), account: account?.data ?? null };
    },
  });
  const rate = Number(quote?.account?.discount_rate ?? 0);
  const priceOf = (item: { product_id: string; price: number }) => Number(quote?.products.get(item.product_id)?.price ?? item.price);
  const changed = items.filter((i) => quote?.products.has(i.product_id) && priceOf(i) !== i.price);
  const unavailableItems = (products: NonNullable<typeof quote>["products"]) => items.filter((item) => {
    const product = products.get(item.product_id);
    return !product?.is_active || !isOrderable(product.price, product.stock) || item.quantity > product.stock || item.quantity > 100000;
  });
  const unavailable = quote ? unavailableItems(quote.products) : [];
  const units = items.reduce((count, item) => count + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + priceOf(item) * item.quantity, 0);
  const total = items.reduce((s, i) => s + discounted(priceOf(i), rate) * i.quantity, 0);
  const order = async () => {
    if (inFlight.current || !user || !quote || isError || unavailable.length || tooManyItems) return;
    inFlight.current = true;
    setBusy(true);
    let orderId: string | undefined;
    try {
      const { data: latest } = await refetch({ throwOnError: true });
      if (!latest) throw new Error("Güncel sepet bilgileri alınamadı.");
      if (unavailableItems(latest.products).length) {
        toast.error("Bazı ürünler artık sipariş edilemiyor. Sepetinizi gözden geçirin.");
        return;
      }
      if (latest.account?.id !== quote.account?.id || Number(latest.account?.discount_rate ?? 0) !== rate || items.some((item) => Number(latest.products.get(item.product_id)?.price) !== priceOf(item))) {
        toast.info("Fiyat veya cari bilgiler değişti. Güncel toplamı kontrol edip siparişi tekrar gönderin.");
        return;
      }

      const orderItems = items.map(({ product_id, quantity }) => ({ product_id, quantity }));
      const payload = JSON.stringify({ userId: user.id, items: [...orderItems].sort((a, b) => a.product_id.localeCompare(b.product_id)), notes: notes.trim() });
      const stored = sessionStorage.getItem("order-request");
      let request: { payload: string; key: string } | null = null;
      try { request = stored ? JSON.parse(stored) : null; } catch { /* Replace invalid stored request. */ }
      const matches = request?.payload === payload || request?.payload === JSON.stringify({ items, notes });
      const key = matches && request?.key ? request.key : crypto.randomUUID();
      sessionStorage.setItem("order-request", JSON.stringify({ payload, key }));
      const { data, error } = await supabase.rpc("place_order_once", { _items: orderItems, _notes: notes, _request_key: key });
      if (error) { toast.error(error.message); return; }
      orderId = data;
    } catch {
      toast.error("Sipariş tamamlanamadı. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
    if (!orderId) return;
    setPlacedOrder({ id: orderId });
    try {
      clear();
      sessionStorage.removeItem("order-request");
    } catch { /* The order is already saved. */ }
    toast.success("Sipariş talebiniz alındı");
    try {
      const { data: receipt } = await supabase.from("orders").select("order_no,created_at,total").eq("id", orderId).maybeSingle();
      if (receipt) setPlacedOrder({ id: orderId, orderNo: receipt.order_no, createdAt: receipt.created_at, total: Number(receipt.total) });
    } catch { /* The order ID remains available if the receipt cannot be fetched. */ }
  };
  if (placedOrder && items.length === 0) return (
    <section className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <CheckCircle2 className="mb-4 h-8 w-8 text-success" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold sm:text-3xl">Sipariş talebiniz alındı</h1>
        <dl className="mt-6 divide-y rounded-lg border px-4 text-sm">
          {placedOrder.orderNo !== undefined && <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Sipariş no</dt><dd className="font-semibold">#{placedOrder.orderNo}</dd></div>}
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3"><dt className="text-muted-foreground">Sipariş ID</dt><dd className="break-all font-mono text-xs font-medium">{placedOrder.id}</dd></div>
          {placedOrder.createdAt && <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Sipariş tarihi</dt><dd><time dateTime={placedOrder.createdAt}>{cartDate.format(new Date(placedOrder.createdAt))}</time></dd></div>}
          {placedOrder.total !== undefined && <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Sipariş tutarı</dt><dd className="font-bold tabular-nums">{money(placedOrder.total)}</dd></div>}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild><Link to="/hesabim">Siparişlerime git</Link></Button>
          <Button asChild variant="outline"><Link to="/urunler" search={{}}>Alışverişe devam et</Link></Button>
        </div>
      </div>
    </section>
  );
  if (items.length === 0) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-2xl font-extrabold">Sepetiniz boş</h1><Link to="/urunler" search={{}} className="mt-4 inline-block text-accent">Ürünlere göz atın →</Link></div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b pb-5">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Sepetim</h1>
        <Link to="/urunler" search={{}} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Alışverişe devam et</Link>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-4">
          <section aria-labelledby="cart-products" className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-4 sm:px-5">
              <h2 id="cart-products" className="text-lg font-bold">Sipariş kalemleri</h2>
              <p className="text-sm text-muted-foreground">{items.length} kalem · {units} adet</p>
            </div>
            <table role="table" aria-labelledby="cart-products" className="block w-full text-sm xl:table">
              <thead role="rowgroup" className="sr-only bg-muted/70 text-left text-xs font-semibold text-muted-foreground xl:not-sr-only xl:table-header-group">
                <tr role="row">
                  <th scope="col" className="px-5 py-3">Ürün</th>
                  <th scope="col" className="whitespace-nowrap px-3 py-3">Eklenme tarihi</th>
                  <th scope="col" className="px-3 py-3">Adet</th>
                  <th scope="col" className="whitespace-nowrap px-3 py-3 text-right">Birim fiyat</th>
                  <th scope="col" className="whitespace-nowrap px-3 py-3 text-right">Tutar</th>
                  <th scope="col"><span className="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="block divide-y xl:table-row-group">
                {items.map((item) => {
                  const sku = quote?.products.get(item.product_id)?.sku ?? item.sku;
                  const unitPrice = discounted(priceOf(item), rate);
                  return (
                    <tr role="row" key={item.product_id} className="relative grid grid-cols-3 gap-x-3 gap-y-4 p-4 sm:px-5 xl:table-row xl:p-0">
                      <td role="cell" className="col-span-3 min-w-0 pr-10 align-middle xl:px-5 xl:py-4">
                        <p className="break-words font-semibold">{item.name}</p>
                        {sku && <p className="mt-1 text-xs font-medium text-primary">KM No {sku}</p>}
                        <p className="mt-1 break-all text-xs text-muted-foreground">Ürün ID <span className="font-mono">{item.product_id}</span></p>
                        {changed.includes(item) && <p className="mt-1 text-xs font-medium text-accent">Önceki birim fiyat {money(discounted(item.price, rate))}</p>}
                        {unavailable.includes(item) && <p className="mt-1 text-xs font-medium text-destructive">Mevcut adetle sipariş edilemiyor.</p>}
                      </td>
                      <td role="cell" className="col-span-3 text-xs text-muted-foreground xl:whitespace-nowrap xl:px-3 xl:py-4">
                        <span className="mr-2 font-medium xl:hidden">Eklenme tarihi</span>
                        {item.added_at ? <time dateTime={item.added_at}>{cartDate.format(new Date(item.added_at))}</time> : "Kayıt yok"}
                      </td>
                      <td role="cell" className="xl:px-3 xl:py-4">
                        <span className="mb-1 block text-xs text-muted-foreground xl:hidden">Adet</span>
                        <Input className="h-9 w-full max-w-24 bg-background tabular-nums xl:w-20" type="number" min={1} max={item.stock} value={item.quantity} disabled={busy} aria-label={`${item.name} adedi`} onChange={(e) => setQty(item.product_id, Number(e.target.value))} />
                      </td>
                      <td role="cell" className="text-right tabular-nums xl:px-3 xl:py-4">
                        <span className="mb-1 block text-xs text-muted-foreground xl:hidden">Birim fiyat</span>
                        <span className="block py-2 xl:py-0">{money(unitPrice)}</span>
                      </td>
                      <td role="cell" className="text-right tabular-nums xl:px-3 xl:py-4">
                        <span className="mb-1 block text-xs text-muted-foreground xl:hidden">Tutar</span>
                        <span className="block py-2 font-bold xl:py-0">{money(unitPrice * item.quantity)}</span>
                      </td>
                      <td role="cell" className="absolute right-3 top-3 xl:static xl:px-2 xl:py-4">
                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => remove(item.product_id)} disabled={busy} aria-label={`${item.name} ürününü kaldır`}><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
          <section className="space-y-2 rounded-xl border bg-card p-4 sm:p-5">
            <Label htmlFor="cart-notes" className="text-sm font-semibold">Sipariş notu <span className="font-normal text-muted-foreground">(isteğe bağlı)</span></Label>
            <Textarea id="cart-notes" className="min-h-24 bg-background" maxLength={2000} placeholder="Teslimat veya siparişle ilgili notunuz" value={notes} disabled={busy} onChange={(e) => setNotes(e.target.value)} />
          </section>
        </div>
        <aside aria-labelledby="cart-summary" className="rounded-xl border bg-card p-5 shadow-sm lg:sticky lg:top-6">
          <h2 id="cart-summary" className="text-lg font-bold">Sipariş özeti</h2>
          <dl className="mt-4 space-y-3 text-sm tabular-nums">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ara toplam</dt><dd className="text-right font-medium">{money(subtotal)}</dd></div>
            {rate > 0 && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Cari iskonto (%{rate})</dt><dd className="text-right font-medium text-success">{money(Math.round((total - subtotal) * 100) / 100)}</dd></div>}
            <div className="flex items-baseline justify-between gap-3 border-t pt-3"><dt className="font-semibold">Genel toplam</dt><dd className="text-right font-display text-2xl font-extrabold">{money(total)}</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{quote?.account ? "Sipariş onaylandığında cari hesabınıza borç olarak yazılır." : "Siparişiniz onaylandıktan sonra sizinle iletişime geçilir."}</p>
          {unavailable.length > 0 && <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">Siparişe uygun olmayan kalemlerin adetlerini düzenleyin veya sepetten kaldırın.</p>}
          {isError && <div role="alert" className="mt-3 text-sm text-destructive">Güncel sepet bilgileri alınamadı. <Button variant="link" onClick={() => void refetch()}>Tekrar dene</Button></div>}
          {tooManyItems && <p role="alert" className="mt-3 text-sm text-destructive">Bir siparişte en fazla 500 kalem olabilir.</p>}
          {!quote && !isError && !tooManyItems && <p className="mt-3 text-sm text-muted-foreground">Güncel fiyatlar kontrol ediliyor…</p>}
          {user ? <Button className="mt-4 w-full" size="lg" disabled={busy || !quote || isError || tooManyItems || unavailable.length > 0} onClick={() => void order()}>{busy ? "Sipariş kontrol ediliyor…" : "Sipariş talebi gönder"}</Button>
            : <Button asChild className="mt-4 w-full" size="lg"><Link to="/auth">Sipariş için giriş yapın</Link></Button>}
        </aside>
      </div>
    </div>
  );
}
