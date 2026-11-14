import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, User, ShieldCheck, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, isAdmin, account } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    await supabase.auth.signOut();
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "catalog" });
    navigate({ to: "/auth", replace: true });
  };
  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-ink text-ink-foreground">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-2 md:flex-nowrap md:gap-6">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-extrabold md:text-xl">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-accent text-accent-foreground">K</span>
          KLİPSMARKET
        </Link>
        <nav className="hidden gap-5 text-sm md:flex">
          <Link to="/urunler" search={{}} className="opacity-80 hover:opacity-100" activeProps={{ className: "opacity-100 font-semibold" }}>Tüm Ürünler</Link>
          <Link to="/hakkimizda" className="opacity-80 hover:opacity-100" activeProps={{ className: "opacity-100 font-semibold" }}>Hakkımızda</Link>
          <Link to="/iletisim" className="opacity-80 hover:opacity-100" activeProps={{ className: "opacity-100 font-semibold" }}>İletişim</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {account && <span className="hidden rounded-sm bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground sm:inline">Cari: %{Number(account.discount_rate)} iskonto</span>}
          {isAdmin && (
            <Button asChild size="sm" variant="secondary"><Link to="/admin" aria-label="Yönetim"><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Yönetim</span></Link></Button>
          )}
          <Link to="/sepet" className="relative rounded-md p-2 hover:bg-sidebar-accent" aria-label="Sepet">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-warning px-1 text-[11px] font-bold text-ink">{count}</span>}
          </Link>
          {user ? (
            <>
              <Link to="/hesabim" className="rounded-md p-2 hover:bg-sidebar-accent" aria-label="Hesabım"><User className="h-5 w-5" /></Link>
              <button onClick={signOut} className="rounded-md p-2 hover:bg-sidebar-accent" aria-label="Çıkış"><LogOut className="h-5 w-5" /></button>
            </>
          ) : (
            <Link to="/auth"><Button size="sm" variant="secondary">Giriş Yap</Button></Link>
          )}
        </div>
      </div>
      <nav aria-label="Mobil menü" className="flex gap-6 overflow-x-auto border-t border-sidebar-border px-4 py-3 text-sm md:hidden">
        <Link to="/urunler" search={{}} className="shrink-0 opacity-80" activeProps={{ className: "opacity-100 font-semibold" }}>Tüm Ürünler</Link>
        <Link to="/hakkimizda" className="shrink-0 opacity-80" activeProps={{ className: "opacity-100 font-semibold" }}>Hakkımızda</Link>
        <Link to="/iletisim" className="shrink-0 opacity-80" activeProps={{ className: "opacity-100 font-semibold" }}>İletişim</Link>
      </nav>
    </header>
  );
}
