import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS, date, money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/siparisler")({ component: Orders });

function Orders() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const [o, p] = await Promise.all([
        supabase.from("orders").select("*, items:order_items(*), account:customer_accounts(company_name)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,email,full_name"),
      ]);
      return { orders: o.data ?? [], profiles: new Map((p.data ?? []).map((x) => [x.id, x])) };
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
    </div>
  );
}
