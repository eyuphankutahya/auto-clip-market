import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, date, money } from "@/lib/format";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { OrderDialog } from "@/components/site/OrderDialog";

export const Route = createFileRoute("/_authenticated/admin/siparisler")({ head: () => ({ meta: [{ title: "Sipariş Yönetimi — KlipsMarket" }, { name: "description", content: "Müşteri siparişlerini ve durumlarını yönetin." }, { property: "og:title", content: "Sipariş Yönetimi — KlipsMarket" }, { property: "og:description", content: "Müşteri siparişlerini ve durumlarını yönetin." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Orders });

function Orders() {
  const qc = useQueryClient();
  const [status, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const orderNo = /^\d+$/.test(q.trim()) ? Number(q.trim()) : null;
  const { data } = useQuery({
    queryKey: ["admin-orders", status, page, orderNo],
    queryFn: async () => {
      let query = supabase.from("orders").select("*, items:order_items(*), account:customer_accounts(company_name)", { count: "exact" });
      if (status !== "all") query = query.eq("status", status);
      if (orderNo !== null) query = query.eq("order_no", orderNo);
      const o = await query.order("created_at", { ascending: false }).order("id").range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (o.error) throw new Error(o.error.message);
      const ids = [...new Set((o.data ?? []).map((x) => x.user_id))];
      const p = ids.length ? await supabase.from("profiles").select("id,email,full_name").in("id", ids) : { data: [] };
      return { orders: o.data ?? [], total: o.count ?? 0, profiles: new Map((p.data ?? []).map((x) => [x.id, x])) };
    },
  });
  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Durum güncellendi");
    qc.invalidateQueries();
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <select value={status} onChange={(e) => { setFilter(e.target.value); setPage(0); }} className="rounded-md border bg-background px-2 py-1.5 text-sm" aria-label="Duruma göre filtrele">
          <option value="all">Tüm siparişler</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Sipariş no, firma veya e-posta" className="max-w-xs" aria-label="Sipariş ara" />
        {data && <Pager page={page} total={data.total} onChange={setPage} />}
      </div>
      {data?.orders.length === 0 && <p className="text-muted-foreground">Sipariş yok.</p>}
      {data?.orders.filter((o) => { if (!q.trim() || orderNo !== null) return true; const u = data.profiles.get(o.user_id); const t = `${o.account?.company_name ?? ""} ${u?.full_name ?? ""} ${u?.email ?? ""}`.toLocaleLowerCase("tr"); return t.includes(q.trim().toLocaleLowerCase("tr")); }).map((o) => {
        const u = data.profiles.get(o.user_id);
        return (
          <div key={o.id} className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold">#{o.order_no} · {o.account?.company_name ?? u?.full_name ?? u?.email}</div>
                <div className="text-xs text-muted-foreground">{date(o.created_at)} · {u?.email}{o.account ? ` · Cari (%${Number(o.discount_rate)})` : ""}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-lg font-extrabold">{money(o.total)}</span>
                {o.status === "pending" && <Button size="sm" onClick={() => setStatus(o.id, "approved")}>Onayla</Button>}
                {o.status === "approved" && <Button size="sm" onClick={() => setStatus(o.id, "shipped")}>Kargola</Button>}
                <Button size="icon" variant="ghost" aria-label="Yazdır" onClick={() => printOrder(o, o.account?.company_name ?? u?.full_name ?? u?.email ?? "")}><Printer className="h-4 w-4" /></Button>
                <select aria-label="Durum" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <ul className="mt-2 text-sm text-muted-foreground">{o.items.map((i) => <li key={i.id}>{i.quantity} × {i.product_name} — {money(i.unit_price)}</li>)}</ul>
            {o.notes && <p className="mt-2 text-sm">Not: {o.notes}</p>}
          </div>
        );
      })}
      {data && <Pager page={page} total={data.total} onChange={setPage} />}
    </div>
  );
}

function printOrder(o: { order_no: number; created_at: string; total: number; notes: string | null; items: { product_name: string; quantity: number; unit_price: number }[] }, customer: string) {
  const w = window.open("", "_blank", "width=800,height=900"); if (!w) return;
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  w.document.write(`<html><head><title>Sipariş #${o.order_no}</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px;text-align:left}.r{text-align:right}</style></head><body><h2>KlipsMarket · Sipariş #${o.order_no}</h2><p>${esc(customer)} · ${date(o.created_at)}</p><table><tr><th>Ürün</th><th class="r">Adet</th><th class="r">Birim</th><th class="r">Tutar</th></tr>${o.items.map((i) => `<tr><td>${esc(i.product_name)}</td><td class="r">${i.quantity}</td><td class="r">${money(i.unit_price)}</td><td class="r">${money(i.quantity * Number(i.unit_price))}</td></tr>`).join("")}<tr><th colspan="3" class="r">Toplam</th><th class="r">${money(o.total)}</th></tr></table>${o.notes ? `<p>Not: ${esc(o.notes)}</p>` : ""}<script>print()</script></body></html>`);
  w.document.close();
}
