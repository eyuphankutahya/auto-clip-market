import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";
import { fetchAll } from "@/lib/fetch-all";
import { Stat } from "@/components/site/CariStatement";

export const Route = createFileRoute("/_authenticated/admin/")({ head: () => ({ meta: [{ title: "Stok ve Satış Raporları — KlipsMarket" }, { name: "description", content: "Stok seviyeleri ve ürün satış raporları." }, { property: "og:title", content: "Stok ve Satış Raporları — KlipsMarket" }, { property: "og:description", content: "Stok seviyeleri ve ürün satış raporları." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Dashboard });

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-dash"],
    queryFn: async () => {
      const [p, sales, pur] = await Promise.all([
        fetchAll((from, to) => supabase.from("products").select("id,name,stock,min_stock,price").order("stock").order("id").range(from, to)),
        fetchAll((from, to) => supabase.from("product_sales").select("product_id, quantity, revenue").order("product_id").range(from, to)),
        fetchAll((from, to) => supabase.from("purchases").select("quantity, unit_cost, supplier:suppliers(name)").order("id").range(from, to)),
      ]);
      return { products: p, sales, purchases: pur };
    },
  });
  if (!data) return <p className="text-muted-foreground">Yükleniyor…</p>;
  const sold = new Map<string, { q: number; t: number }>();
  data.sales.forEach((r) => { if (r.product_id) sold.set(r.product_id, { q: Number(r.quantity ?? 0), t: Number(r.revenue ?? 0) }); });
  const soldList = data.products.filter((p) => sold.has(p.id)).sort((a, b) => sold.get(b.id)!.q - sold.get(a.id)!.q);
  const unsold = data.products.filter((p) => !sold.has(p.id));
  const critical = data.products.filter((p) => p.stock <= p.min_stock);
  const bySup = new Map<string, number>();
  data.purchases.forEach((x) => { const n = x.supplier?.name ?? "—"; bySup.set(n, (bySup.get(n) ?? 0) + x.quantity * Number(x.unit_cost)); });
  const revenue = [...sold.values()].reduce((s, v) => s + v.t, 0);
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Ürün sayısı" value={data.products.length} />
        <Stat label="Kritik stok" value={critical.length} tone={critical.length ? "text-destructive" : ""} />
        <Stat label="Satış cirosu" value={money(revenue)} />
        <Stat label="Satılmayan ürün" value={unsold.length} />
      </div>
      <section>
        <h2 className="mb-2 font-extrabold">Stok durumu</h2>
        <div className="max-h-[480px] overflow-y-auto rounded-md border">
        <table className="w-full bg-card text-sm">
          <thead className="bg-secondary text-left"><tr><th className="p-2">Ürün</th><th className="p-2 text-right">Stok</th><th className="p-2 text-right">Kritik seviye</th><th className="p-2 text-right">Durum</th></tr></thead>
          <tbody>{data.products.map((p) => <tr key={p.id} className="border-t"><td className="p-2">{p.name}</td><td className="p-2 text-right font-semibold">{p.stock}</td><td className="p-2 text-right text-muted-foreground">{p.min_stock}</td>
            <td className="p-2 text-right">{p.stock <= 0 ? <span className="text-destructive font-semibold">Tükendi</span> : p.stock <= p.min_stock ? <span className="text-warning font-semibold">Kritik</span> : <span className="text-success">Yeterli</span>}</td></tr>)}</tbody>
        </table>
        </div>
      </section>
      <div className="grid gap-8 md:grid-cols-3">
        <section><h2 className="mb-2 font-extrabold">Satılan ürünler</h2>
          <table className="w-full rounded-md border bg-card text-sm"><tbody>
            {soldList.length === 0 && <tr><td className="p-3 text-muted-foreground">Henüz satış yok</td></tr>}
            {soldList.map((p) => <tr key={p.id} className="border-t"><td className="p-2">{p.name}</td><td className="p-2 text-right">{sold.get(p.id)!.q}</td><td className="p-2 text-right">{money(sold.get(p.id)!.t)}</td></tr>)}
          </tbody></table></section>
        <section><h2 className="mb-2 font-extrabold">Satılmayan ürünler</h2>
          <div className="max-h-[480px] overflow-y-auto rounded-md border"><table className="w-full bg-card text-sm"><tbody>
            {unsold.map((p) => <tr key={p.id} className="border-t"><td className="p-2">{p.name}</td><td className="p-2 text-right text-muted-foreground">{p.stock} stok</td></tr>)}
          </tbody></table></div></section>
        <section><h2 className="mb-2 font-extrabold">Tedarikçi bazlı alımlar</h2>
          <table className="w-full rounded-md border bg-card text-sm"><tbody>
            {bySup.size === 0 && <tr><td className="p-3 text-muted-foreground">Alım yok</td></tr>}
            {[...bySup].map(([n, t]) => <tr key={n} className="border-t"><td className="p-2">{n}</td><td className="p-2 text-right">{money(t)}</td></tr>)}
          </tbody></table></section>
      </div>
    </div>
  );
}
