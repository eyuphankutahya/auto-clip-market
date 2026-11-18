import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Stat } from "@/components/site/CariStatement";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stockReportQuery } from "@/lib/admin-reports";
import { compareProductCodes } from "@/lib/catalog-rules";
import { isStockShortage, type StockLevel } from "@/lib/stock-shortages";

export const Route = createFileRoute("/_authenticated/admin/raporlar/stok-durumu")({
  head: () => ({ meta: [{ title: "Stok Durumu — KlipsMarket" }] }),
  component: StockReport,
});

const statuses = {
  empty: { label: "Tükendi", className: "bg-red-50 text-red-800" },
  low: { label: "Minimum altı", className: "bg-amber-50 text-amber-900" },
  sufficient: { label: "Yeterli", className: "bg-emerald-50 text-emerald-800" },
  inactive: { label: "Satışa kapalı", className: "bg-secondary text-secondary-foreground" },
};
const sorts = { stockAsc: "Stok · azdan çoğa", stockDesc: "Stok · çoktan aza", sku: "KM No · artan" };
const numbers = new Intl.NumberFormat("tr-TR");
const selectStyle = "h-9 w-full rounded-md border bg-background px-3 text-sm";
const columns = ["KM No", "Ürün", "Mevcut stok", "Minimum stok", "Maksimum stok", "Durum"];

function productStatus(product: Pick<StockLevel, "stock" | "min_stock"> & { is_active: boolean }): keyof typeof statuses {
  if (!product.is_active) return "inactive";
  if (product.stock === 0) return "empty";
  return isStockShortage(product) ? "low" : "sufficient";
}

function StockReport() {
  const { data, isPending, isError, refetch } = useQuery(stockReportQuery);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("stockAsc");
  const [pageIndex, setPageIndex] = useState(0);
  const term = search.trim().toLocaleLowerCase("tr");
  const products = (data ?? []).map((product) => ({ ...product, status: productStatus(product) }));
  const counts = { empty: 0, low: 0, sufficient: 0, inactive: 0 };
  for (const product of products) counts[product.status]++;
  const filtered = products.filter((product) =>
    (status === "all" || product.status === status) &&
    (!term || [product.sku ?? "", product.name].some((value) => value.toLocaleLowerCase("tr").includes(term))),
  ).sort((a, b) => {
    if (sort === "stockAsc" && a.stock !== b.stock) return a.stock - b.stock;
    if (sort === "stockDesc" && a.stock !== b.stock) return b.stock - a.stock;
    return compareProductCodes(a, b);
  });
  const page = Math.min(pageIndex, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));

  return (
    <section aria-label="Stok durumu raporu" className="min-w-0 space-y-5">
      {data && <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Tükenen ürün" value={numbers.format(counts.empty)} tone={counts.empty ? "text-destructive" : ""} />
        <Stat label="Minimum altı ürün" value={numbers.format(counts.low)} tone={counts.low ? "text-amber-800" : ""} />
        <Stat label="Stoğu yeterli ürün" value={numbers.format(counts.sufficient)} />
        <Stat label="Satışa kapalı ürün" value={numbers.format(counts.inactive)} />
      </div>}
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="stock-report-search">Ürün ara</Label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="stock-report-search" type="search" maxLength={200} placeholder="KM No veya ürün adı" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPageIndex(0); }} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock-report-status">Stok durumu</Label>
          <select id="stock-report-status" className={selectStyle} value={status} onChange={(e) => { setStatus(e.target.value); setPageIndex(0); }}>
            <option value="all">Tüm durumlar</option>
            {Object.entries(statuses).map(([value, entry]) => <option key={value} value={value}>{entry.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock-report-sort">Sıralama</Label>
          <select id="stock-report-sort" className={selectStyle} value={sort} onChange={(e) => { setSort(e.target.value); setPageIndex(0); }}>
            {Object.entries(sorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {isPending && <p role="status" className="text-sm text-muted-foreground">Stok durumu yükleniyor…</p>}
      {isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 text-sm">
        Stok durumu yüklenemedi.
        <Button variant="outline" size="sm" onClick={() => void refetch()}>Tekrar dene</Button>
      </div>}
      {data && (filtered.length ? <>
        <p role="status" className="text-sm text-muted-foreground">{numbers.format(filtered.length)} ürün listeleniyor</p>
        <div className="overflow-x-auto rounded-lg border">
          <table aria-label="Ürün stok durumu" className="w-full bg-card text-sm">
            <thead className="bg-secondary text-left"><tr>{columns.map((column, index) => (
              <th key={column} scope="col" className={`whitespace-nowrap px-4 py-3 ${index >= 2 ? "text-right" : ""}`}>{column}</th>
            ))}</tr></thead>
            <tbody>{filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((product) => (
              <tr key={product.id} className="border-t hover:bg-secondary/35">
                <td className="whitespace-nowrap px-4 py-3 font-oem text-muted-foreground">{product.sku ?? "—"}</td>
                <th scope="row" className="min-w-48 px-4 py-3 text-left font-semibold">
                  <Link to="/admin/stok-hareketleri" search={{ urun: product.id }} className="underline-offset-4 hover:text-primary hover:underline focus-visible:underline" title="Stok hareketlerini aç">{product.name}</Link>
                </th>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{numbers.format(product.stock)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{numbers.format(product.min_stock)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{product.max_stock === null ? "—" : numbers.format(product.max_stock)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${statuses[product.status].className}`}>{statuses[product.status].label}</span>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <Pager page={page} total={filtered.length} onChange={setPageIndex} />
      </> : <p role="status" className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">{products.length ? "Filtrelere uygun ürün bulunamadı." : "Henüz ürün bulunmuyor."}</p>)}
    </section>
  );
}
