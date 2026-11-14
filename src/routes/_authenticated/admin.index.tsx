import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, date, money } from "@/lib/format";
import { fetchAll } from "@/lib/fetch-all";
import { Stat } from "@/components/site/CariStatement";

const T = "Yönetim Özeti — KlipsMarket";
const D = "Günlük satış, bekleyen siparişler, kritik stok ve cari alacak özeti.";
export const Route = createFileRoute("/_authenticated/admin/")({ head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Overview });

const DAY = 864e5;
const dayKey = (d: Date) => d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const since = new Date(Date.now() - 29 * DAY); since.setHours(0, 0, 0, 0);
      const [orders, pending, low, out, balances, messages, latest] = await Promise.all([
        fetchAll((a, b) => supabase.from("orders").select("id,total,status,created_at").gte("created_at", since.toISOString()).order("id").range(a, b)),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        fetchAll((a, b) => supabase.from("products").select("id,stock,min_stock").order("id").range(a, b)),
        supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 0),
        fetchAll((a, b) => supabase.from("account_balances").select("balance").order("customer_account_id").range(a, b)),
        supabase.from("contact_submissions").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * DAY).toISOString()),
        supabase.from("orders").select("id,order_no,total,status,created_at,account:customer_accounts(company_name)").eq("status", "pending").order("created_at", { ascending: false }).limit(8),
      ]);
      return { since, orders, pending: pending.count ?? 0, critical: low.filter((p) => p.stock <= p.min_stock).length, out: out.count ?? 0, receivable: balances.reduce((s, r) => s + Math.max(0, Number(r.balance ?? 0)), 0), messages: messages.count ?? 0, latest: latest.data ?? [] };
    },
  });
  if (!data) return <p className="text-muted-foreground">Yükleniyor…</p>;
  const active = data.orders.filter((o) => o.status === "approved" || o.status === "shipped");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTotal = active.filter((o) => new Date(o.created_at) >= today).reduce((s, o) => s + Number(o.total), 0);
  const monthTotal = active.reduce((s, o) => s + Number(o.total), 0);
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(data.since.getTime() + i * DAY); return { key: dayKey(d), total: 0 }; });
  const idx = new Map(days.map((d, i) => [d.key, i]));
  active.forEach((o) => { const i = idx.get(dayKey(new Date(o.created_at))); if (i !== undefined) days[i]!.total += Number(o.total); });
  const max = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Bugünkü satış" value={money(todayTotal)} />
        <Stat label="Son 30 gün satış" value={money(monthTotal)} />
        <Stat label="Toplam cari alacak" value={money(data.receivable)} tone={data.receivable > 0 ? "text-destructive" : ""} />
        <Link to="/admin/siparisler" className="block hover:opacity-90"><Stat label="Bekleyen sipariş →" value={data.pending} tone={data.pending ? "text-warning" : ""} /></Link>
        <Link to="/admin/eksik-stok" className="block hover:opacity-90"><Stat label={`Kritik stok (${data.out} tükendi) →`} value={data.critical} tone={data.critical ? "text-destructive" : ""} /></Link>
        <Link to="/admin/mesajlar" className="block hover:opacity-90"><Stat label="Son 7 gün mesaj →" value={data.messages} /></Link>
      </div>
      <section className="rounded-md border bg-card p-4">
        <h2 className="mb-3 font-extrabold">Son 30 gün satışlar <span className="text-sm font-normal text-muted-foreground">(onaylanan ve kargolanan)</span></h2>
        <div className="flex h-44 items-end gap-1" role="img" aria-label="Son 30 günlük satış grafiği">
          {days.map((d) => <div key={d.key} className="group relative flex-1"><div className="w-full rounded-t-sm bg-accent" style={{ height: `${Math.max(2, (d.total / max) * 160)}px`, opacity: d.total ? 1 : 0.2 }} /><span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-xs text-ink-foreground group-hover:block">{d.key}: {money(d.total)}</span></div>)}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{days[0]!.key}</span><span>{days[29]!.key}</span></div>
      </section>
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-extrabold">Onay bekleyen siparişler</h2><Link to="/admin/siparisler" className="text-sm font-semibold text-accent underline">Tümü</Link></div>
        <div className="overflow-x-auto rounded-md border"><table className="w-full bg-card text-sm"><thead className="bg-secondary text-left"><tr><th className="p-2">No</th><th className="p-2">Tarih</th><th className="p-2">Müşteri</th><th className="p-2">Durum</th><th className="p-2 text-right">Tutar</th></tr></thead><tbody>
          {data.latest.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Bekleyen sipariş yok.</td></tr>}
          {data.latest.map((o) => <tr key={o.id} className="border-t"><td className="p-2 font-semibold">#{o.order_no}</td><td className="p-2">{date(o.created_at)}</td><td className="p-2">{o.account?.company_name ?? "Standart müşteri"}</td><td className="p-2">{STATUS[o.status]}</td><td className="p-2 text-right font-semibold">{money(o.total)}</td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}
