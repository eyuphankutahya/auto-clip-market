import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { Stat } from "@/components/site/CariStatement";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reportPages, supplierReportQuery } from "@/lib/admin-reports";
import { downloadCsv } from "@/lib/csv";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/raporlar/tedarikci-alimlari")({
  head: () => ({ meta: [{ title: "Tedarikçi Bazlı Alımlar — KlipsMarket" }] }),
  component: SupplierReport,
});

const sortOptions = { total: "Maliyet · yüksekten düşüğe", quantity: "Alım adedi · çoktan aza", latest: "Son alım tarihi · en yeni", name: "Tedarikçi adı · A–Z" };
const headers = ["Tedarikçi", "Alım kaydı", "Alınan adet", "Toplam alış maliyeti (TL)", "Son alım tarihi"];
const numbers = new Intl.NumberFormat("tr-TR");
const supplierNameOrder = new Intl.Collator("tr");

function SupplierReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("total");
  const [pageIndex, setPageIndex] = useState(0);
  const invalidDates = Boolean(from && to && from > to);
  const report = useQuery(supplierReportQuery(from, to));
  const term = search.trim().toLocaleLowerCase("tr");
  const rows = (report.data ?? []).filter((row) => row.name.toLocaleLowerCase("tr").includes(term)).sort((a, b) => {
    const byName = supplierNameOrder.compare(a.name, b.name) || (a.id ?? "").localeCompare(b.id ?? "");
    switch (sort) {
      case "quantity": return b.quantity - a.quantity || byName;
      case "latest": return b.lastDate.localeCompare(a.lastDate) || byName;
      case "name": return byName;
      default: return b.totalCents - a.totalCents || byName;
    }
  });
  const page = Math.min(pageIndex, Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1));
  const totalCost = rows.reduce((sum, row) => sum + row.totalCents, 0) / 100;
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const totalRecords = rows.reduce((sum, row) => sum + row.count, 0);
  const exportReport = () => downloadCsv("tedarikci-alimlari.csv", headers, rows.map((row) => [row.name, row.count, row.quantity, row.totalCents / 100, row.lastDate]));

  return (
    <section aria-label={reportPages[2].label} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 sm:p-5">
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{reportPages[2].description} Tarih aralığını alım tarihine göre daraltabilirsiniz.</p>
        <Button onClick={exportReport} variant="outline" disabled={!rows.length || invalidDates}><Download aria-hidden="true" />CSV indir</Button>
      </div>
      {!invalidDates && report.data && <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Alım kaydı" value={numbers.format(totalRecords)} />
        <Stat label="Toplam alınan adet" value={numbers.format(totalQuantity)} />
        <Stat label="Toplam alış maliyeti" value={money(totalCost)} />
      </div>}
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2"><Label htmlFor="supplier-report-search">Tedarikçi ara</Label><Input type="search" id="supplier-report-search" placeholder="Tedarikçi adı" value={search} onChange={(e) => { setSearch(e.target.value); setPageIndex(0); }} /></div>
        <div className="space-y-2"><Label htmlFor="supplier-report-from">Başlangıç tarihi</Label><Input type="date" id="supplier-report-from" value={from} onChange={(e) => { setFrom(e.target.value); setPageIndex(0); }} /></div>
        <div className="space-y-2"><Label htmlFor="supplier-report-to">Bitiş tarihi</Label><Input type="date" id="supplier-report-to" value={to} onChange={(e) => { setTo(e.target.value); setPageIndex(0); }} /></div>
        <div className="space-y-2"><Label htmlFor="supplier-report-sort">Sıralama</Label><select id="supplier-report-sort" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={sort} onChange={(e) => { setSort(e.target.value); setPageIndex(0); }}>
          {Object.entries(sortOptions).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></div>
      </div>
      {invalidDates ? <p className="rounded-lg border bg-card p-4 text-sm text-destructive" role="alert">Bitiş tarihi başlangıç tarihinden önce olamaz.</p> : <>
        {report.isPending && <p role="status" className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Alımlar yükleniyor…</p>}
        {report.isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 text-sm">Tedarikçi raporu yüklenemedi. <Button variant="outline" size="sm" onClick={() => void report.refetch()}>Tekrar dene</Button></div>}
        {report.data && (rows.length ? <>
          <div className="overflow-x-auto rounded-lg border">
            <table aria-label="Tedarikçi bazlı alımlar" className="w-full bg-card text-sm">
              <thead className="bg-secondary text-left"><tr>{headers.map((header, index) => <th scope="col" key={header} className={`whitespace-nowrap px-4 py-3 ${index > 0 ? "text-right" : ""}`}>{header}</th>)}</tr></thead>
              <tbody>{rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((row) => <tr key={row.id ?? "unassigned"} className="border-t hover:bg-secondary/35">
                <th scope="row" className="min-w-40 px-4 py-3 text-left font-semibold">{row.name}</th>
                <td className="px-4 py-3 text-right tabular-nums">{numbers.format(row.count)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{numbers.format(row.quantity)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{money(row.totalCents / 100)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums"><time dateTime={row.lastDate}>{row.lastDate.split("-").reverse().join(".")}</time></td>
              </tr>)}</tbody>
            </table>
          </div>
          <Pager page={page} total={rows.length} onChange={setPageIndex} />
        </> : <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground" role="status">Filtrelere uyan alım kaydı bulunamadı.</p>)}
      </>}
    </section>
  );
}
