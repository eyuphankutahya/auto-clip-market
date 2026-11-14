import { useState } from "react";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { date, money } from "@/lib/format";
import { fetchAll } from "@/lib/fetch-all";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS: Record<string,string> = { pending:"Bekliyor", approved:"Onaylandı", shipped:"Kargolandı", cancelled:"İptal" };

export function useCariData(accountId: string) {
  return useQuery({
    queryKey: ["cari", accountId],
    queryFn: async () => {
      const [tx, orders] = await Promise.all([
        fetchAll((from, to) => supabase.from("account_transactions").select("*").eq("customer_account_id", accountId).order("created_at").order("id").range(from, to)),
        fetchAll((from, to) => supabase.from("orders").select("id, order_no, status, created_at, total, discount_rate, notes, items:order_items(id, product_id, product_name, quantity, unit_price,product:products(sku))").eq("customer_account_id", accountId).in("status", ["approved", "shipped"]).order("created_at").order("id").range(from, to), 200),
      ]);
      return { tx, orders };
    },
  });
}

export function CariStatement({ accountId }: { accountId: string }) {
  const { data } = useCariData(accountId);
  const [historyPage,setHistoryPage]=useState(0);
  const [openOrder,setOpenOrder]=useState<string|null>(null);
  if (!data) return <p className="text-muted-foreground">Yükleniyor…</p>;
  const debit = data.tx.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  const credit = data.tx.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  let run = 0;
  const bought = new Map<string, { q: number; t: number }>();
  data.orders.forEach((o) => o.items.forEach((i) => { const c = bought.get(i.product_name) ?? { q: 0, t: 0 }; bought.set(i.product_name, { q: c.q + i.quantity, t: c.t + i.quantity * Number(i.unit_price) }); }));
  const payments = data.tx.filter((t) => t.type === "credit");
  const history = [
    ...data.orders.flatMap(order=>order.items.map(item=>({id:item.id,date:order.created_at,code:item.product?.sku ?? item.product_id ?? "—",name:item.product_name,quantity:item.quantity,price:Number(item.unit_price),payment:`Cari borç`,orderId:order.id as string|null,orderNo:order.order_no as number|null}))),
    ...payments.map(payment=>({id:payment.id,date:payment.created_at,code:"—",name:payment.description ?? "Tahsilat",quantity:null,price:Number(payment.amount),payment:`${payment.payment_method ?? "Ödeme"} · Tahsilat`,orderId:null,orderNo:null}))
  ].sort((a,b)=>b.date.localeCompare(a.date));
  return (
    <div className="space-y-8">
      <OrderDialog order={data.orders.find(o=>o.id===openOrder) ?? null} onClose={()=>setOpenOrder(null)} />
      <section><h3 className="mb-3 font-bold">Geçmiş hareketler</h3><div className="overflow-x-auto border"><table className="w-full bg-card text-sm"><thead className="bg-secondary text-left"><tr>{["Tarih","Ürün ID / KM No","Ürün adı","Alım adet","Fiyat","Ödeme bilgisi"].map(h=><th key={h} className="whitespace-nowrap p-3">{h}</th>)}</tr></thead><tbody>{history.slice(historyPage*PAGE_SIZE,(historyPage+1)*PAGE_SIZE).map(row=><tr key={row.id} className="border-t"><td className="whitespace-nowrap p-3">{date(row.date)}</td><td className="p-3 font-oem">{row.code}</td><td className="min-w-40 p-3">{row.name}</td><td className="p-3">{row.quantity ?? "—"}</td><td className="whitespace-nowrap p-3">{money(row.price)}</td><td className="min-w-40 p-3">{row.payment}{row.orderId && <> · <button type="button" onClick={()=>setOpenOrder(row.orderId)} className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">Sipariş #{row.orderNo}</button></>}</td></tr>)}</tbody></table>{!history.length && <p className="p-6 text-muted-foreground">Henüz hareket yok.</p>}</div><Pager page={historyPage} total={history.length} onChange={setHistoryPage}/></section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Toplam borç" value={money(debit)} />
        <Stat label="Toplam ödeme" value={money(credit)} />
        <Stat label="Bakiye" value={money(debit - credit)} tone={debit - credit > 0 ? "text-destructive" : "text-success"} />
      </div>
      <section>
        <h3 className="mb-2 font-extrabold">Cari hareketleri</h3>
        <table className="w-full rounded-md border bg-card text-sm">
          <thead className="bg-secondary text-left"><tr><th className="p-2">Tarih</th><th className="p-2">Açıklama</th><th className="p-2 text-right">Borç</th><th className="p-2 text-right">Alacak</th><th className="p-2 text-right">Bakiye</th></tr></thead>
          <tbody>
            {data.tx.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Hareket yok</td></tr>}
            {data.tx.map((t) => { run += t.type === "debit" ? Number(t.amount) : -Number(t.amount); return (
              <tr key={t.id} className="border-t"><td className="p-2">{date(t.created_at)}</td><td className="p-2">{t.description}{t.payment_method && ` (${t.payment_method})`}</td>
                <td className="p-2 text-right">{t.type === "debit" ? money(t.amount) : ""}</td><td className="p-2 text-right">{t.type === "credit" ? money(t.amount) : ""}</td><td className="p-2 text-right font-semibold">{money(run)}</td></tr>
            ); })}
          </tbody>
        </table>
      </section>
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h3 className="mb-2 font-extrabold">Alınan ürünler</h3>
          <table className="w-full rounded-md border bg-card text-sm"><tbody>
            {bought.size === 0 && <tr><td className="p-4 text-center text-muted-foreground">Henüz yok</td></tr>}
            {[...bought].map(([n, v]) => <tr key={n} className="border-t"><td className="p-2">{n}</td><td className="p-2 text-right">{v.q} adet</td><td className="p-2 text-right">{money(v.t)}</td></tr>)}
          </tbody></table>
        </section>
        <section>
          <h3 className="mb-2 font-extrabold">Ödeme bilgileri</h3>
          <table className="w-full rounded-md border bg-card text-sm"><tbody>
            {payments.length === 0 && <tr><td className="p-4 text-center text-muted-foreground">Ödeme yok</td></tr>}
            {payments.map((t) => <tr key={t.id} className="border-t"><td className="p-2">{date(t.created_at)}</td><td className="p-2">{t.payment_method}</td><td className="p-2 text-muted-foreground">{t.description}</td><td className="p-2 text-right font-semibold">{money(t.amount)}</td></tr>)}
          </tbody></table>
        </section>
      </div>
    </div>
  );
}

export function Stat({ label, value, tone = "" }: { label: string; value: string | number; tone?: string }) {
  return <div className="rounded-md border bg-card p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div><div className={`mt-1 font-display text-2xl font-extrabold ${tone}`}>{value}</div></div>;
}

type CariOrder = NonNullable<ReturnType<typeof useCariData>["data"]>["orders"][number];
function OrderDialog({ order, onClose }: { order: CariOrder | null; onClose: () => void }) {
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        {order && <>
          <DialogHeader><DialogTitle>Sipariş #{order.order_no}</DialogTitle></DialogHeader>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div><span className="text-muted-foreground">Tarih:</span> {date(order.created_at)}</div>
            <div><span className="text-muted-foreground">Durum:</span> {STATUS[order.status] ?? order.status}</div>
            <div><span className="text-muted-foreground">İskonto:</span> %{Number(order.discount_rate)}</div>
          </div>
          {order.notes && <p className="rounded-md bg-secondary p-3 text-sm"><span className="font-semibold">Not:</span> {order.notes}</p>}
          <div className="max-h-[50vh] overflow-auto border"><table className="w-full text-sm"><thead className="bg-secondary text-left"><tr><th className="p-2">KM No</th><th className="p-2">Ürün</th><th className="p-2 text-right">Adet</th><th className="p-2 text-right">Birim</th><th className="p-2 text-right">Tutar</th></tr></thead>
            <tbody>{order.items.map(i => <tr key={i.id} className="border-t"><td className="p-2 font-oem">{i.product?.sku ?? "—"}</td><td className="p-2">{i.product_name}</td><td className="p-2 text-right">{i.quantity}</td><td className="whitespace-nowrap p-2 text-right">{money(i.unit_price)}</td><td className="whitespace-nowrap p-2 text-right">{money(i.quantity * Number(i.unit_price))}</td></tr>)}</tbody></table></div>
          <div className="text-right font-display text-lg font-extrabold">Toplam: {money(order.total)}</div>
        </>}
      </DialogContent>
    </Dialog>
  );
}
