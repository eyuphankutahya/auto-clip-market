import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.rpc("has_role", { _user_id: u.user!.id, _role: "admin" });
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Yönetim Paneli — KlipsMarket" }, { name: "description", content: "Stok, sipariş ve cari yönetimi." }, { property: "og:title", content: "Yönetim Paneli — KlipsMarket" }, { property: "og:description", content: "Stok, sipariş ve cari yönetimi." }] }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Stok & Raporlar" },
  { to: "/admin/siparisler", label: "Siparişler" },
  { to: "/admin/urunler", label: "Ürünler" },
  { to: "/admin/cariler", label: "Cari Hesaplar" },
  { to: "/admin/alimlar", label: "Alımlar & Tedarikçiler" },
] as const;

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} activeOptions={{ exact: t.to === "/admin" }} className="-mb-px border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground" activeProps={{ className: "border-accent! text-foreground!" }}>{t.label}</Link>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
