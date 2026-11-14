import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { STATUS, date, money } from "@/lib/format";
import { CariStatement } from "@/components/site/CariStatement";
import { Pager } from "@/components/site/Pager";
import { useState } from "react";
import { customerType } from "@/lib/customer-access";

export const Route = createFileRoute("/_authenticated/hesabim")({
  head: () => ({ meta: [{ title: "Hesabım — KlipsMarket" }, { name: "description", content: "Siparişleriniz ve cari hesabınız." }, { property: "og:title", content: "Hesabım — KlipsMarket" }, { property: "og:description", content: "Siparişleriniz ve cari hesabınız." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Account,
});

function Account() {
  const { user, account, isAdmin } = useAuth();
  const type = customerType(isAdmin, user?.id, account);
  const [page, setPage] = useState(0);
  const PER = 20;
  const { data } = useQuery({
    queryKey: ["my-orders", user?.id, page],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return { rows: [], total: 0 };
      const r = await supabase.from("orders").select("*, items:order_items(*)", { count: "exact" }).eq("user_id", user.id).order("created_at", { ascending: false }).order("id").range(page * PER, page * PER + PER - 1);
      if (r.error) throw new Error(r.error.message);
      return { rows: r.data ?? [], total: r.count ?? 0 };
    },
  });
  const orders = data?.rows;
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <h1 className="text-3xl font-extrabold">Hesabım</h1>
      <p className="text-sm font-semibold text-accent">{type === "superadmin" ? "Süper admin" : type === "special" ? "Özel müşteri" : "Standart müşteri"}</p>
      {account && (
        <section className="space-y-4">
          <div className="rounded-md border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">Cari hesap</div>
            <div className="font-display text-xl font-extrabold">{account.company_name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{account.address} · {account.phone} · İskonto %{Number(account.discount_rate)}</div>
          </div>
          <CariStatement accountId={account.id} />
        </section>
      )}
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Siparişlerim</h2>
        <div className="space-y-3">
          {orders?.length === 0 && <p className="text-muted-foreground">Henüz siparişiniz yok.</p>}
          {orders?.map((o) => (
            <div key={o.id} className="rounded-md border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold">Sipariş #{o.order_no} <span className="ml-2 text-sm font-normal text-muted-foreground">{date(o.created_at)}</span></div>
                <span className="rounded-sm bg-secondary px-2 py-1 text-xs font-semibold">{STATUS[o.status]}</span>
              </div>
              <ul className="mt-2 text-sm text-muted-foreground">{o.items.map((i) => <li key={i.id}>{i.quantity} × {i.product_name} — {money(i.unit_price)}</li>)}</ul>
              <div className="mt-2 text-right font-bold">{money(o.total)}</div>
            </div>
          ))}
          {data && <Pager page={page} total={data.total} pageSize={PER} onChange={setPage} />}
        </div>
      </section>
    </div>
  );
}
