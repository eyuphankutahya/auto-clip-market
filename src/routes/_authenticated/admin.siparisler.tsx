import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, date, money } from "@/lib/format";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { OrderDialog } from "@/components/site/OrderDialog";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv } from "@/lib/csv";
import { matchesCustomer, orderDateBounds, orderListHeader, orderListRow } from "@/lib/order-export";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkOrderActions } from "@/components/site/BulkOrderActions";
import { bulkOrderTargets, toggleSelection } from "@/lib/admin-rules";
import { updateOrderStatuses } from "@/lib/admin-order-actions";

export const Route = createFileRoute("/_authenticated/admin/siparisler")({ head: () => ({ meta: [{ title: "Sipariş Yönetimi — KlipsMarket" }, { name: "description", content: "Müşteri siparişlerini ve durumlarını yönetin." }, { property: "og:title", content: "Sipariş Yönetimi — KlipsMarket" }, { property: "og:description", content: "Müşteri siparişlerini ve durumlarını yönetin." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Orders });

function Orders() {
  const qc = useQueryClient();
  const [status, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [customer, setCustomer] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const orderNo = /^\d+$/.test(q.trim()) ? Number(q.trim()) : null;
  const invalidDates = Boolean(from && to && from > to);
  const prepareQuery = async () => {
    let query = supabase.from("orders").select("*, items:order_items(*, product:products(sku)), account:customer_accounts(company_name)", { count: "exact" });
    if (status !== "all") query = query.eq("status", status);
    if (orderNo !== null) query = query.eq("order_no", orderNo);
    else if (q.trim()) query = query.eq("order_no", -1);
    const bounds = orderDateBounds(from, to);
    if (bounds.from) query = query.gte("created_at", bounds.from);
    if (bounds.to) query = query.lt("created_at", bounds.to);
    if (customer.trim()) {
      const [profiles, accounts] = await Promise.all([
        fetchAll((a, b) => supabase.from("profiles").select("id,email,full_name").order("id").range(a, b)),
        fetchAll((a, b) => supabase.from("customer_accounts").select("id,company_name").order("id").range(a, b)),
      ]);
      const users = profiles.filter(p => matchesCustomer(p.full_name, customer) || matchesCustomer(p.email, customer)).map(p => p.id);
      const companies = accounts.filter(a => matchesCustomer(a.company_name, customer)).map(a => a.id);
      const clauses = [users.length ? `user_id.in.(${users.join(",")})` : "", companies.length ? `customer_account_id.in.(${companies.join(",")})` : ""].filter(Boolean);
      if (clauses.length) query = query.or(clauses.join(","));
      else query = query.eq("order_no", -1);
    }
    return { query: query.order("created_at", { ascending: false }).order("id") };
  };
  const { data, error, isFetching } = useQuery({
    queryKey: ["admin-orders", status, page, q.trim(), customer.trim(), from, to],
    enabled: !invalidDates,
    queryFn: async () => {
      const { query } = await prepareQuery();
      const o = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (o.error) throw new Error(o.error.message);
      const ids = [...new Set((o.data ?? []).map((x) => x.user_id))];
      const p = ids.length ? await supabase.from("profiles").select("id,email,full_name").in("id", ids) : { data: [] };
      if ("error" in p && p.error) throw new Error(p.error.message);
      return { orders: o.data ?? [], total: o.count ?? 0, profiles: new Map((p.data ?? []).map((x) => [x.id, x])) };
    },
  });
  const exportOrders = async () => {
    setExporting(true);
    try {
      const { query } = await prepareQuery();
      const orders = await fetchAll((a, b) => query.range(a, b));
      const ids = new Set(orders.map(o => o.user_id));
      const profiles = orders.length ? await fetchAll((a, b) => supabase.from("profiles").select("id,email,full_name").order("id").range(a, b)) : [];
      const pm = new Map(profiles.filter(p => ids.has(p.id)).map(p => [p.id, p]));
      downloadCsv("siparis-listesi.csv", orderListHeader, orders.map(o => {
        const p = pm.get(o.user_id);
        return orderListRow(o, o.account?.company_name || p?.full_name || p?.email || "—", p?.email ?? "");
      }));
    } catch (err) { toast.error(err instanceof Error ? err.message : "CSV indirilemedi."); }
    finally { setExporting(false); }
  };
  const setStatus = async (order: { id: string; status: string; order_no: number }, target: string) => {
    if (savingStatus || !bulkOrderTargets[target]?.includes(order.status)) return;
    if (target === "cancelled" && !confirm(`Sipariş #${order.order_no} iptal edilsin mi?`)) return;
    setSavingStatus(true);
    try {
      await updateOrderStatuses([order], target);
      toast.success("Durum güncellendi");
      await qc.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sipariş durumu güncellenemedi.");
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } finally {
      setSavingStatus(false);
    }
  };
  return (
    <div className="space-y-3">
      <OrderDialog order={data?.orders.find((order) => order.id === openOrder) ?? null} onClose={() => setOpenOrder(null)} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">Başlangıç tarihi<Input aria-label="Başlangıç tarihi" type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} /></label>
        <label className="text-xs">Bitiş tarihi<Input aria-label="Bitiş tarihi" type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0); }} /></label>
        <select value={status} onChange={(e) => { setFilter(e.target.value); setPage(0); }} className="rounded-md border bg-background px-2 py-1.5 text-sm" aria-label="Duruma göre filtrele">
          <option value="all">Tüm siparişler</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Input value={customer} onChange={e => { setCustomer(e.target.value); setPage(0); }} placeholder="Müşteri adı, firma veya e-posta" className="max-w-xs" aria-label="Müşteri ara" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Sipariş no" className="max-w-36" aria-label="Sipariş ara" />
        <Button variant="outline" disabled={invalidDates || isFetching || exporting || !data?.total} onClick={exportOrders}><Download />{exporting ? "Hazırlanıyor…" : "Listeyi CSV indir"}</Button>
        <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); setCustomer(""); setQ(""); setFilter("all"); setPage(0); }}>Filtreleri temizle</Button>
      </div>
      {invalidDates && <p role="alert" className="text-sm text-destructive">Bitiş tarihi başlangıç tarihinden önce olamaz.</p>}
      {error && <p role="alert" className="text-sm text-destructive">Siparişler yüklenemedi: {error.message}</p>}
      {isFetching && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}
      {data && <Pager page={page} total={data.total} onChange={setPage} />}
      {Boolean(data?.orders.length) && <label className="flex items-center gap-2 py-2 text-sm"><Checkbox aria-label="Bu sayfadaki siparişleri seç" checked={Boolean(data?.orders.length && data.orders.every(o => selected.includes(o.id)))} onCheckedChange={checked => setSelected(checked ? data?.orders.map(o => o.id) ?? [] : [])} />Bu sayfadaki siparişleri seç</label>}
      {Boolean(data?.orders.some(o => selected.includes(o.id))) && <BulkOrderActions orders={data?.orders.filter(o => selected.includes(o.id)) ?? []} onSaved={() => { qc.invalidateQueries(); }} onClear={() => setSelected([])} />}
      {data?.orders.length === 0 && <p className="text-muted-foreground">Sipariş yok.</p>}
      {data?.orders.map((o) => {
        const u = data.profiles.get(o.user_id);
        const availableStatuses = Object.keys(bulkOrderTargets).filter((target) => bulkOrderTargets[target]?.includes(o.status));
        return (
          <div key={o.id} className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold"><Checkbox aria-label={`Sipariş #${o.order_no} seç`} checked={selected.includes(o.id)} onCheckedChange={() => setSelected(ids => toggleSelection(ids,o.id))} /><Button variant="link" onClick={() => setOpenOrder(o.id)} className="h-auto p-0 font-bold underline" aria-label={`Sipariş #${o.order_no} ayrıntıları`}>#{o.order_no}</Button><span>· {o.account?.company_name ?? u?.full_name ?? u?.email}</span></div>
                <div className="text-xs text-muted-foreground">{date(o.created_at)} · {u?.email}{o.account ? ` · Cari (%${Number(o.discount_rate)})` : ""}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-lg font-extrabold">{money(o.total)}</span>
                {o.status === "pending" && <Button size="sm" disabled={savingStatus} onClick={() => void setStatus(o, "approved")}>Onayla</Button>}
                {o.status === "approved" && <Button size="sm" disabled={savingStatus} onClick={() => void setStatus(o, "shipped")}>Kargola</Button>}
                <Button size="icon" variant="ghost" aria-label="Yazdır" onClick={() => printOrder(o, o.account?.company_name ?? u?.full_name ?? u?.email ?? "")}><Printer className="h-4 w-4" /></Button>
                <select aria-label="Durum" value={o.status} disabled={savingStatus || !availableStatuses.length} onChange={(e) => void setStatus(o, e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
                  {[o.status, ...availableStatuses].map((key) => <option key={key} value={key}>{STATUS[key]}</option>)}
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
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
  w.document.write(`<html><head><title>Sipariş #${o.order_no}</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px;text-align:left}.r{text-align:right}</style></head><body><h2>KlipsMarket · Sipariş #${o.order_no}</h2><p>${esc(customer)} · ${date(o.created_at)}</p><table><tr><th>Ürün</th><th class="r">Adet</th><th class="r">Birim</th><th class="r">Tutar</th></tr>${o.items.map((i) => `<tr><td>${esc(i.product_name)}</td><td class="r">${i.quantity}</td><td class="r">${money(i.unit_price)}</td><td class="r">${money(i.quantity * Number(i.unit_price))}</td></tr>`).join("")}<tr><th colspan="3" class="r">Toplam</th><th class="r">${money(o.total)}</th></tr></table>${o.notes ? `<p>Not: ${esc(o.notes)}</p>` : ""}<script>print()</script></body></html>`);
  w.document.close();
}
