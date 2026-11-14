import { createFileRoute, Link } from "@tanstack/react-router";
import { Package, ShoppingCart, MessageSquare, Building2, Mail, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { STATUS, date, money } from "@/lib/format";
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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border bg-card p-5 md:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">{type === "superadmin" ? "Süper admin" : type === "special" ? "Özel müşteri" : "Standart müşteri"}</div>
          <div className="mt-1 font-display text-xl font-extrabold">{(user?.user_metadata?.full_name as string) || "Hoş geldiniz"}</div>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" />{user?.email}</div>
            {user?.created_at && <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Üyelik: {date(user.created_at)}</div>}
            <div className="flex items-center gap-2"><Package className="h-4 w-4" />Toplam sipariş: {data?.total ?? 0}</div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 md:col-span-2">
          <QuickLink to="/urunler" icon={<Package className="h-5 w-5" />} title="Ürünleri incele" text="KM No, OEM veya araç markasıyla arayın." />
          <QuickLink to="/sepet" icon={<ShoppingCart className="h-5 w-5" />} title="Sepetim" text="Sepetinizi kontrol edip sipariş talebi oluşturun." />
          <QuickLink to="/iletisim" icon={<MessageSquare className="h-5 w-5" />} title="Bize ulaşın" text="Ürün veya sipariş sorularınız için yazın." />
        </div>
      </div>
      {!account && type === "standard" && (
        <section className="flex flex-col gap-3 rounded-md border border-accent/40 bg-secondary p-5 sm:flex-row sm:items-center">
          <Building2 className="h-8 w-8 shrink-0 text-accent" />
          <div className="flex-1"><div className="font-bold">Toplu alım mı yapıyorsunuz?</div><p className="text-sm text-muted-foreground">Firmanıza cari hesap açılırsa özel iskontolu fiyatlar görür, siparişlerinizi cari hesabınıza işletebilir ve bakiyenizi buradan takip edersiniz.</p></div>
          <Link to="/iletisim" className="font-semibold text-accent underline">Cari hesap talep et</Link>
        </section>
      )}
      {account && (
        <section className="space-y-4">
          <div className="rounded-md border bg-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-accent">Cari hesap</div>
            <div className="font-display text-xl font-extrabold">{account.company_name}</div>
            <div className="mt-1 text-sm text-muted-foreground">{account.address} · {account.phone} · İskonto %{Number(account.discount_rate)}</div>
          </div>
          <Link to="/cari-hesabim" className="inline-block font-semibold text-accent underline">Bakiye, hareketler ve ödemeler →</Link>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-xl font-extrabold">Siparişlerim</h2>
        <div className="space-y-3">
          {orders?.length === 0 && <div className="rounded-md border border-dashed bg-card p-8 text-center"><Package className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 font-semibold">Henüz siparişiniz yok</p><p className="text-sm text-muted-foreground">Ürünleri sepetinize ekleyip sipariş talebi oluşturduğunuzda burada durumunu takip edebilirsiniz.</p><Link to="/urunler" search={{}} className="mt-3 inline-block font-semibold text-accent underline">Ürünlere göz at</Link></div>}
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

function QuickLink({ to, icon, title, text }: { to: "/urunler" | "/sepet" | "/iletisim"; icon: React.ReactNode; title: string; text: string }) {
  return <Link to={to} search={to === "/urunler" ? {} : undefined} className="rounded-md border bg-card p-4 transition-colors hover:border-accent"><div className="text-accent">{icon}</div><div className="mt-2 font-bold">{title}</div><p className="text-sm text-muted-foreground">{text}</p></Link>;
}
