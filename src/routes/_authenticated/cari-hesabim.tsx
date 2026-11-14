import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { CariStatement } from "@/components/site/CariStatement";

const T = "Cari Hesabım — KlipsMarket";
const D = "Cari bakiyeniz, hesap hareketleriniz ve ödeme bilgileriniz.";

export const Route = createFileRoute("/_authenticated/cari-hesabim")({
  head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: CariPortal,
});

function CariPortal() {
  const { account } = useAuth();
  if (!account) return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold">Cari hesabınız bulunmuyor</h1>
      <p className="mt-2 text-muted-foreground">Toplu alım için cari hesap açılmasını isterseniz bizimle iletişime geçin.</p>
      <Link to="/iletisim" className="mt-4 inline-block font-semibold text-accent underline">İletişim</Link>
    </div>
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="rounded-md border bg-card p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-accent">Cari hesabım</div>
        <h1 className="font-display text-2xl font-extrabold">{account.company_name}</h1>
        <div className="mt-1 text-sm text-muted-foreground">{[account.address, account.phone].filter(Boolean).join(" · ")} · İskonto %{Number(account.discount_rate)}</div>
      </div>
      <CariStatement accountId={account.id} />
    </div>
  );
}
