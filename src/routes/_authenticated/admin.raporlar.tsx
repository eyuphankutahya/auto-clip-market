import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { reportPages } from "@/lib/admin-reports";

export const Route = createFileRoute("/_authenticated/admin/raporlar")({
  head: () => ({ meta: [{ title: "Raporlar ve Analizler — KlipsMarket" }] }),
  component: ReportsLayout,
});

function ReportsLayout() {
  const tabStyle = "rounded-md border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
  const activeProps = { className: "border-border bg-card text-primary shadow-sm" };
  return (
    <div className="space-y-6">
      <nav aria-label="Rapor sayfaları" className="flex flex-wrap gap-1 rounded-lg border bg-secondary/45 p-1.5">
        <Link to="/admin/raporlar" activeOptions={{ exact: true }} className={tabStyle} activeProps={activeProps}>Rapor özeti</Link>
        {reportPages.map((page) => <Link key={page.to} to={page.to} className={tabStyle} activeProps={activeProps}>{page.label}</Link>)}
      </nav>
      <Outlet />
    </div>
  );
}
