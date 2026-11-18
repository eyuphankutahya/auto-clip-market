import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { useState } from "react";
import { Stat } from "@/components/site/CariStatement";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { productReportQuery, reportPages } from "@/lib/admin-reports";
import { compareProductCodes } from "@/lib/catalog-rules";
import { downloadCsv } from "@/lib/csv";
import { money } from "@/lib/format";

const soldSorts = { quantity: "Satış adedi · çoktan aza", revenue: "Satış cirosu · yüksekten düşüğe", sku: "KM No · artan" };
const unsoldSorts = { stockAsc: "Stok · azdan çoğa", stockDesc: "Stok · çoktan aza", sku: "KM No · artan" };
const numbers = new Intl.NumberFormat("tr-TR");

export function ProductSalesReport({ mode }: { mode: "sold" | "unsold" }) {
  const sold = mode === "sold";
  const report = reportPages[sold ? 0 : 1];
  const { data, isPending, isError, refetch } = useQuery(productReportQuery);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sort, setSort] = useState(sold ? "quantity" : "stockAsc");
  const [pageIndex, setPageIndex] = useState(0);
  const term = search.trim().toLocaleLowerCase("tr");
  const rows = (data ?? []).filter((product) => {
    if (product.sold !== sold) return false;
    if (!sold && stockFilter === "inStock" && product.stock === 0) return false;
    if (!sold && stockFilter === "outOfStock" && product.stock > 0) return false;
    if (!sold && stockFilter === "closed" && product.is_active) return false;
    return !term || [product.sku ?? "", product.name].some((value) => value.toLocaleLowerCase("tr").includes(term));
  }).sort((a, b) => {
    switch (sort) {
      case "quantity": return b.quantity - a.quantity || compareProductCodes(a, b);
      case "revenue": return b.revenue - a.revenue || compareProductCodes(a, b);
      case "stockAsc": return a.stock - b.stock || compareProductCodes(a, b);
      case "stockDesc": return b.stock - a.stock || compareProductCodes(a, b);
      default: return compareProductCodes(a, b);
    }
  });
  const page = Math.min(pageIndex, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
  const quantity = rows.reduce((sum, product) => sum + (sold ? product.quantity : product.stock), 0);
  const revenue = rows.reduce((sum, product) => sum + product.revenue, 0);
  const status = (active: boolean) => active ? "Satışa açık" : "Satışa kapalı";
  const headers = sold ? ["KM No", "Ürün", "Satılan adet", "Ciro (TL)", "Mevcut stok"] : ["KM No", "Ürün", "Mevcut stok", "Minimum stok", "Satış durumu"];
  const exportReport = () => downloadCsv(`${sold ? "satilan" : "satilmayan"}-urunler.csv`, headers, rows.map((product) => sold
    ? [product.sku, product.name, product.quantity, product.revenue, product.stock]
    : [product.sku, product.name, product.stock, product.min_stock, status(product.is_active)]));

  return (
    <section aria-label={report.label} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 sm:p-5">
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{report.description} Veriler tüm dönemleri kapsar.</p>
        <Button onClick={exportReport} variant="outline" disabled={!rows.length}><Download aria-hidden="true" />CSV indir</Button>
      </div>
      {data && <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Listelenen ürün" value={numbers.format(rows.length)} />
        <Stat label={sold ? "Toplam satılan adet" : "Toplam mevcut stok"} value={numbers.format(quantity)} />
        {sold ? <Stat label="Toplam satış cirosu" value={money(revenue)} /> : <Stat label="Stokta bulunan ürün" value={numbers.format(rows.filter((product) => product.stock > 0).length)} />}
      </div>}
      <div className={`grid gap-3 rounded-lg border bg-card p-4 ${sold ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <div className="space-y-2">
          <Label htmlFor="product-report-search">Ürün ara</Label>
          <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="product-report-search" type="search" placeholder="KM No veya ürün adı" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPageIndex(0); }} />
          </div>
        </div>
        {!sold && <div className="space-y-2">
          <Label htmlFor="product-report-stock">Stok ve satış durumu</Label>
          <select id="product-report-stock" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPageIndex(0); }}>
            <option value="all">Tüm ürünler</option><option value="inStock">Stokta olanlar</option><option value="outOfStock">Stoğu tükenenler</option><option value="closed">Satışa kapalı olanlar</option>
          </select>
        </div>}
        <div className="space-y-2">
          <Label htmlFor="product-report-sort">Sıralama</Label>
          <select id="product-report-sort" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={sort} onChange={(e) => { setSort(e.target.value); setPageIndex(0); }}>
            {Object.entries(sold ? soldSorts : unsoldSorts).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
      </div>
      {isPending && <p role="status" className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Ürünler yükleniyor…</p>}
      {isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 text-sm">Ürün raporu yüklenemedi. <Button variant="outline" size="sm" onClick={() => void refetch()}>Tekrar dene</Button></div>}
      {data && (rows.length ? <>
        <div className="overflow-x-auto rounded-lg border">
          <table aria-label={report.label} className="w-full bg-card text-sm">
            <thead className="bg-secondary text-left"><tr>{headers.map((header, index) => <th scope="col" key={header} className={`whitespace-nowrap px-4 py-3 ${index >= 2 ? "text-right" : ""}`}>{header}</th>)}</tr></thead>
            <tbody>{rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((product) => (
              <tr key={product.id} className="border-t hover:bg-secondary/35">
                <td className="whitespace-nowrap px-4 py-3 font-oem text-muted-foreground">{product.sku ?? "—"}</td>
                <th scope="row" className="min-w-48 px-4 py-3 text-left font-semibold">{product.name}</th>
                {sold ? <>
                  <td className="px-4 py-3 text-right tabular-nums">{numbers.format(product.quantity)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{money(product.revenue)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{numbers.format(product.stock)}</td>
                </> : <>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{numbers.format(product.stock)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{numbers.format(product.min_stock)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">{status(product.is_active)}</td>
                </>}
              </tr>
            ))}</tbody>
          </table>
        </div>
        <Pager page={page} total={rows.length} onChange={setPageIndex} />
      </> : <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground" role="status">Bu raporda filtrelere uyan ürün bulunamadı.</p>)}
    </section>
  );
}
