import { useState } from "react";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { date, money } from "@/lib/format";
import { fetchAll } from "@/lib/fetch-all";
import { OrderDialog } from "@/components/site/OrderDialog";

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
  const bought = new Map<string, { name: string; sku: string | null; q: number; t: number }>();
  for (const order of data.orders) {
    for (const item of order.items) {
      const key = item.product_id ?? item.id;
      const previous = bought.get(key);
      bought.set(key, { name: item.product_name, sku: item.product?.sku ?? null, q: (previous?.q ?? 0) + item.quantity, t: (previous?.t ?? 0) + item.quantity * Number(item.unit_price) });
    }
  }
  const payments = data.tx.filter((t) => t.type === "credit");
  const history = [
    ...data.orders.map(order=>({id:order.id,date:order.created_at,name:order.items.length===1?order.items[0]?.product_name ?? "Ürün":`${order.items.length} kalem ürün`,quantity:order.items.reduce((t,i)=>t+i.quantity,0),price:Number(order.total),payment:"Cari borç",orderId:order.id as string|null,orderNo:order.order_no as number|null})),
    ...payments.map(payment=>({id:payment.id,date:payment.created_at,name:payment.description ?? "Tahsilat",quantity:null,price:Number(payment.amount),payment:`${payment.payment_method ?? "Ödeme"} · Tahsilat`,orderId:null,orderNo:null}))
  ].sort((a,b)=>b.date.localeCompare(a.date));
  return (
    <div className="space-y-8">
      <OrderDialog order={data.orders.find(o=>o.id===openOrder) ?? null} onClose={()=>setOpenOrder(null)} />
      <section><h3 className="mb-3 font-bold">Geçmiş hareketler</h3><div className="overflow-x-auto border"><table className="w-full bg-card text-sm"><thead className="bg-secondary text-left"><tr>{["Tarih","Sipariş No","Ürünler","Toplam adet","Tutar","Ödeme bilgisi"].map(h=><th key={h} className="whitespace-nowrap p-3">{h}</th>)}</tr></thead><tbody>{history.slice(historyPage*PAGE_SIZE,(historyPage+1)*PAGE_SIZE).map(row=><tr key={row.id} className="border-t"><td className="whitespace-nowrap p-3">{date(row.date)}</td><td className="whitespace-nowrap p-3">{row.orderId ? <button type="button" onClick={()=>setOpenOrder(row.orderId)} className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">#{row.orderNo}</button> : "—"}</td><td className="min-w-40 p-3">{row.name}</td><td className="p-3">{row.quantity ?? "—"}</td><td className="whitespace-nowrap p-3">{money(row.price)}</td><td className="min-w-40 p-3">{row.payment}</td></tr>)}</tbody></table>{!history.length && <p className="p-6 text-muted-foreground">Henüz hareket yok.</p>}</div><Pager page={historyPage} total={history.length} onChange={setHistoryPage}/></section>

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
              <tr key={t.id} className="border-t"><td className="p-2">{date(t.created_at)}</td><td className="p-2">{t.order_id && data.orders.some(o=>o.id===t.order_id) ? <button type="button" onClick={()=>setOpenOrder(t.order_id)} className="font-semibold text-primary underline underline-offset-2 hover:opacity-80">{t.description}</button> : t.description}{t.payment_method && ` (${t.payment_method})`}</td>
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
            {[...bought].map(([id, v]) => <tr key={id} className="border-t"><td className="p-2">{v.sku ? `${v.sku} · ` : ""}{v.name}</td><td className="p-2 text-right">{v.q} adet</td><td className="p-2 text-right">{money(v.t)}</td></tr>)}
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


