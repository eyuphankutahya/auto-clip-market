import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, User, ShieldCheck, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

const navLink = "flex min-h-10 shrink-0 items-center rounded-md px-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3.5";
const activeNav = { className: "bg-secondary text-foreground" };
const iconLink = "relative grid h-10 w-10 shrink-0 place-items-center rounded-lg text-primary hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring max-[359px]:w-8";

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
    <header className="sticky top-0 z-40 border-b bg-card/95 shadow-xs backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6 lg:min-h-19 lg:flex-nowrap lg:gap-8">
        <Link to="/" className="flex shrink-0 items-center gap-1.5 rounded-lg font-display text-base font-extrabold tracking-tight focus-visible:outline-2 focus-visible:outline-ring sm:gap-2.5 sm:text-xl">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-lg text-highlight sm:h-9 sm:w-9">K</span>
          KLİPSMARKET
        </Link>
        <nav aria-label="Ana menü" className="order-last -mx-4 flex min-w-0 basis-[calc(100%+2rem)] gap-1 overflow-x-auto border-t px-3 pt-1.5 sm:-mx-6 sm:basis-[calc(100%+3rem)] sm:px-5 lg:order-none lg:mx-0 lg:w-auto lg:basis-auto lg:border-0 lg:p-0">
          <Link to="/urunler" search={{}} className={navLink} activeProps={activeNav}>Tüm Ürünler</Link>
          <Link to="/hakkimizda" className={navLink} activeProps={activeNav}>Hakkımızda</Link>
          <Link to="/iletisim" className={navLink} activeProps={activeNav}>İletişim</Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-2">
          {account && <Link to="/cari-hesabim" aria-label="Cari hesabım" className="hidden rounded-md bg-secondary px-2.5 py-1.5 text-xs font-semibold text-primary hover:underline sm:inline">Cari: %{Number(account.discount_rate)} iskonto</Link>}
          {isAdmin && (
            <Button asChild size="sm" variant="secondary"><Link to="/admin" aria-label="Yönetim"><ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Yönetim</span></Link></Button>
          )}
          <Link to="/sepet" className={iconLink} aria-label={count > 0 ? `Sepet, ${count} ürün` : "Sepet"}>
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-highlight px-1 text-[11px] font-bold text-ink">{count}</span>}
          </Link>
          {user ? (
            <>
              <Link to="/hesabim" className={iconLink} aria-label="Hesabım"><User className="h-5 w-5" /></Link>
              <button type="button" onClick={signOut} className={iconLink} aria-label="Çıkış"><LogOut className="h-5 w-5" /></button>
            </>
          ) : (
            <Button asChild size="sm" className="h-10 rounded-lg"><Link to="/auth"><User aria-hidden="true" className="hidden sm:block" />Giriş Yap</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}
