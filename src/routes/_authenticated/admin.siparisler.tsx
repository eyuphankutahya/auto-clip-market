import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, date, money } from "@/lib/format";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/siparisler")({ component: Orders });

function Orders() {
  const qc = useQueryClient();
  const [status, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const { data } = useQuery({
    queryKey: ["admin-orders", status, page],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, items:order_items(*), account:customer_accounts(company_name)", { count: "exact" });
      if (status !== "all") q = q.eq("status", status);
      const o = await q.order("created_at", { ascending: false }).order("id").range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
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
        {data && <Pager page={page} total={data.total} onChange={setPage} />}
      </div>
      {data?.orders.length === 0 && <p className="text-muted-foreground">Sipariş yok.</p>}
      {data?.orders.map((o) => {
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
                <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="rounded-md border bg-background px-2 py-1.5 text-sm">
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
