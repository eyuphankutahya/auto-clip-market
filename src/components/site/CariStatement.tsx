import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { date, money } from "@/lib/format";

export function useCariData(accountId: string) {
  return useQuery({
    queryKey: ["cari", accountId],
    queryFn: async () => {
      const [tx, orders] = await Promise.all([
        supabase.from("account_transactions").select("*").eq("customer_account_id", accountId).order("created_at"),
        supabase.from("orders").select("id, order_no, status, created_at, items:order_items(product_name, quantity, unit_price)").eq("customer_account_id", accountId).in("status", ["approved", "shipped"]),
      ]);
      return { tx: tx.data ?? [], orders: orders.data ?? [] };
    },
  });
}

export function CariStatement({ accountId }: { accountId: string }) {
  const { data } = useCariData(accountId);
  if (!data) return <p className="text-muted-foreground">Yükleniyor…</p>;
  const debit = data.tx.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount), 0);
  const credit = data.tx.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount), 0);
  let run = 0;
  const bought = new Map<string, { q: number; t: number }>();
  data.orders.forEach((o) => o.items.forEach((i) => { const c = bought.get(i.product_name) ?? { q: 0, t: 0 }; bought.set(i.product_name, { q: c.q + i.quantity, t: c.t + i.quantity * Number(i.unit_price) }); }));
  const payments = data.tx.filter((t) => t.type === "credit");
  return (
    <div className="space-y-8">
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
