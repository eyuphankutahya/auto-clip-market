import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { reportPages } from "@/lib/admin-reports";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ArrowDownUp, BarChart3, Boxes, ClipboardList, History, LayoutDashboard, Mail, Menu, PackagePlus, RefreshCw, Settings2, ShoppingCart, Truck, Upload, Users, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/" });
    return { adminUserId: u.user.id };
  },
  head: () => ({ meta: [{ title: "Yönetim Paneli — KlipsMarket" }, { name: "description", content: "Stok, sipariş ve cari yönetimi." }, { property: "og:title", content: "Yönetim Paneli — KlipsMarket" }, { property: "og:description", content: "Stok, sipariş ve cari yönetimi." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AdminLayout,
});

const tabs = [
  { to: "/admin", label: "Özet", icon: LayoutDashboard, group: "Genel" },
  { to: "/admin/raporlar", label: "Raporlar ve analizler", icon: BarChart3, group: "Genel" },
  { to: "/admin/islem-gecmisi", label: "İşlem geçmişi", icon: History, group: "Genel" },
  { to: "/admin/urunler", label: "Ürünler", icon: Boxes, group: "Ürünler ve stok" },
  { to: "/admin/urun-ekle", label: "Yeni ürün", icon: PackagePlus, group: "Ürünler ve stok" },
  { to: "/admin/eksik-stok", label: "Eksik stok listesi", icon: AlertTriangle, group: "Ürünler ve stok" },
  { to: "/admin/stok-hareketleri", label: "Stok hareketleri", icon: ArrowDownUp, group: "Ürünler ve stok" },
  { to: "/admin/stok-uyarilari", label: "Stok uyarı ayarları", icon: Settings2, group: "Ürünler ve stok" },
  { to: "/admin/aktarim", label: "Toplu stok aktarımı", icon: Upload, group: "Ürünler ve stok" },
  { to: "/admin/alimlar", label: "Alımlar & Tedarikçiler", icon: Truck, group: "Ürünler ve stok" },
  { to: "/admin/tedarikci-siparisleri", label: "Tedarikçi siparişleri", icon: ClipboardList, group: "Ürünler ve stok" },
  { to: "/admin/siparisler", label: "Siparişler", icon: ClipboardList, group: "Siparişler ve cariler" },
  { to: "/admin/cariler", label: "Cari hesaplar", icon: Users, group: "Siparişler ve cariler" },
  { to: "/admin/mesajlar", label: "İletişim mesajları", icon: Mail, group: "İletişim" },
] as const;

function AdminLayout() {
  const [menu, setMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  const qc = useQueryClient();
  const path = location.pathname.replace(/\/$/, "");
  const report = reportPages.find((page) => page.to === path);
  const current = report ? { label: report.label, group: "Raporlar ve analizler" } : tabs.find((tab) =>
    tab.to === path || (tab.to === "/admin/tedarikci-siparisleri" && path.startsWith(`${tab.to}/`)));
  const navigation = <div className="space-y-6">{["Genel", "Ürünler ve stok", "Siparişler ve cariler", "İletişim"].map(group => <nav key={group} aria-label={group}><h2 className="mb-2 px-3 text-xs font-bold uppercase text-muted-foreground">{group}</h2><div className="space-y-1">{tabs.filter(t => t.group === group).map(t => <Button asChild variant="ghost" key={t.to} className="h-auto w-full justify-start px-3 py-2.5"><Link to={t.to} onClick={() => setMenu(false)} activeOptions={{ exact: t.to === "/admin" }} activeProps={{ className: "bg-secondary text-accent" }}><t.icon className="h-4 w-4 shrink-0" />{t.label}</Link></Button>)}</div></nav>)}</div>;
  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 lg:px-6">
      <aside className="hidden border-r pr-4 lg:block"><div className="sticky top-6"><div className="mb-6 px-3"><span className="text-xs font-semibold uppercase text-accent">KlipsMarket</span><p className="font-display text-lg font-extrabold">Yönetim paneli</p></div>{navigation}</div></aside>
      <div className="min-w-0"><header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4"><div className="flex min-w-0 items-center gap-3"><Button variant="outline" size="icon" aria-label="Yönetim menüsünü aç" className="lg:hidden" onClick={() => setMenu(true)}><Menu /></Button><div><p className="text-xs text-muted-foreground">Yönetim / {current?.group ?? "Cari hesaplar"}</p><h1 className="font-display text-2xl font-extrabold">{current?.label ?? "Cari hesap ayrıntısı"}</h1></div></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" title="Verileri yenile" aria-label="Verileri yenile" disabled={refreshing} onClick={async () => { setRefreshing(true); try { await qc.invalidateQueries(); } finally { setRefreshing(false); } }}><RefreshCw className={refreshing ? "animate-spin" : ""} /></Button><Button asChild variant="outline" size="sm"><Link to="/urunler"><ShoppingCart />Mağaza</Link></Button></div></header><Outlet /></div>
      <Sheet open={menu} onOpenChange={setMenu}><SheetContent side="left" className="overflow-y-auto"><SheetHeader className="mb-6"><SheetTitle>Yönetim paneli</SheetTitle><SheetDescription>KlipsMarket</SheetDescription></SheetHeader>{navigation}</SheetContent></Sheet>
    </div>
  );
}
