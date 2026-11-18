import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { AdminAnalytics } from "@/components/site/AdminAnalytics";
import { Stat } from "@/components/site/CariStatement";
import { Button } from "@/components/ui/button";
import { productReportQuery, reportPages } from "@/lib/admin-reports";
import { money } from "@/lib/format";
import { isStockShortage } from "@/lib/stock-shortages";

export const Route = createFileRoute("/_authenticated/admin/raporlar/")({ component: ReportsOverview });

function ReportsOverview() {
  const products = useQuery(productReportQuery);
  const rows = products.data ?? [];
  const critical = rows.filter((product) => product.is_active && isStockShortage(product)).length;
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {reportPages.map((report) => {
          const Icon = report.icon;
          return <Link key={report.to} to={report.to} className="group flex flex-col items-start gap-3 rounded-lg border bg-card p-4 shadow-sm hover:border-accent focus-visible:outline-2 focus-visible:outline-ring">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-primary"><Icon aria-hidden="true" className="h-5 w-5" /></span>
            <div><h2 className="font-bold">{report.label}</h2><p className="mt-1 text-sm text-muted-foreground">{report.description}</p></div>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary">Raporu aç <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
          </Link>;
        })}
      </div>
      <AdminAnalytics />
      {products.isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 text-sm">Stok özeti yüklenemedi. <Button variant="outline" size="sm" onClick={() => void products.refetch()}>Tekrar dene</Button></div>}
      {products.isPending && <p role="status" className="text-sm text-muted-foreground">Stok özeti yükleniyor…</p>}
      {products.data &&
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Ürün sayısı" value={rows.length} />
          <Stat label="Eksik veya tükenmiş stok" value={critical} tone={critical ? "text-destructive" : ""} />
          <Stat label="Satış cirosu" value={money(rows.reduce((sum, product) => sum + product.revenue, 0))} />
          <Stat label="Satılmayan ürün" value={rows.filter((product) => !product.sold).length} />
        </div>
      }
    </div>
  );
}
