import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Yönetim Paneli — KlipsMarket" }, { name: "description", content: "Stok, sipariş ve cari yönetimi." }, { property: "og:title", content: "Yönetim Paneli — KlipsMarket" }, { property: "og:description", content: "Stok, sipariş ve cari yönetimi." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Özet" },
  { to: "/admin/raporlar", label: "Raporlar" },
  { to: "/admin/siparisler", label: "Siparişler" },
  { to: "/admin/mesajlar", label: "İletişim Mesajları" },
  { to: "/admin/urunler", label: "Ürünler" },
  { to: "/admin/eksik-stok", label: "Eksik Stok Listesi" },
  { to: "/admin/stok-uyarilari", label: "Stok Uyarı Ayarları" },
  { to: "/admin/aktarim", label: "Toplu Stok Aktarımı" },
  { to: "/admin/cariler", label: "Cari Hesaplar" },
  { to: "/admin/alimlar", label: "Alımlar & Tedarikçiler" },
] as const;

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 grid gap-3 border-b pb-4 md:grid-cols-4">
        {[{label:"Genel",paths:["/admin","/admin/raporlar"]},{label:"Ürünler ve stok",paths:["/admin/urunler","/admin/eksik-stok","/admin/stok-uyarilari","/admin/aktarim","/admin/alimlar"]},{label:"Siparişler ve cariler",paths:["/admin/siparisler","/admin/cariler"]},{label:"İletişim",paths:["/admin/mesajlar"]}].map(group=><nav key={group.label} aria-label={group.label}><h2 className="mb-1 text-xs font-bold uppercase text-muted-foreground">{group.label}</h2><div className="flex flex-wrap gap-1">{tabs.filter(t=>group.paths.includes(t.to)).map(t=><Link key={t.to} to={t.to} activeOptions={{exact:t.to==="/admin"}} className="rounded-sm px-2 py-1.5 text-sm font-semibold hover:bg-secondary" activeProps={{className:"bg-secondary text-accent"}}>{t.label}</Link>)}</div></nav>)}
      </div>
      <Outlet />
    </div>
  );
}
