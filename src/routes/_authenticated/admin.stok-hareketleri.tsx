import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, Download, Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Stat } from "@/components/site/CariStatement";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { stockReportQuery } from "@/lib/admin-reports";
import { auditTimestamp } from "@/lib/audit-history";
import { compareProductCodes } from "@/lib/catalog-rules";
import { downloadCsv } from "@/lib/csv";
import { slugify } from "@/lib/format";
import { stockMovementActor, stockMovementCsvHeader, stockMovementCsvRows, stockMovementLabel, stockMovementsQuery } from "@/lib/stock-movements";
import { procurementMovementLinksQuery } from "@/lib/supplier-procurement";

const searchParams = z.object({ urun: z.string().uuid().optional().catch(undefined) });

export const Route = createFileRoute("/_authenticated/admin/stok-hareketleri")({
  validateSearch: searchParams,
  head: () => ({ meta: [{ title: "Stok Hareketleri — KlipsMarket" }] }),
  component: StockMovements,
});

const numbers = new Intl.NumberFormat("tr-TR");
const signed = new Intl.NumberFormat("tr-TR", { signDisplay: "exceptZero" });
const directions = { all: "Tüm hareketler", increase: "Stok artışı", decrease: "Stok azalışı", opening: "Ürün kartı açılışı" };
const productLimit = 12;
type MovementProduct = { id: string; sku: string | null; name: string; stock: number };

function StockMovements() {
  const { urun } = Route.useSearch();
  const products = useQuery(stockReportQuery);
  const [search, setSearch] = useState("");
  const term = search.trim().toLocaleLowerCase("tr");
  const chosen = products.data?.find((product) => product.id === urun);
  const matches = (products.data ?? [])
    .filter((product) => [product.sku ?? "", product.name].some((value) => value.toLocaleLowerCase("tr").includes(term)))
    .sort(compareProductCodes);

  return (
    <div className="space-y-5">
      <section aria-label="Stok hareketi için ürün seçimi" className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="w-full max-w-md space-y-2">
            <Label htmlFor="movement-product">Ürün ara</Label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="movement-product" className="pl-9" type="search" maxLength={200} placeholder="KM No veya ürün adı" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>
          {chosen && <Button asChild size="sm" variant="outline"><Link to="/admin/stok-hareketleri" search={{}} onClick={() => setSearch("")}>Ürün seçimini kaldır</Link></Button>}
        </div>
        {products.isPending && <p role="status" className="text-sm text-muted-foreground">Ürünler yükleniyor…</p>}
        {products.isError && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
          {products.data ? "Ürün listesi yenilenemedi. Son yüklenen bilgiler gösteriliyor." : "Ürün listesi yüklenemedi."}
          <Button size="sm" variant="outline" disabled={products.isFetching} onClick={() => void products.refetch()}>Tekrar dene</Button>
        </div>}
        {urun && products.data && !chosen && <p role="status" className="text-sm text-muted-foreground">Seçilen ürün katalogda bulunamadı.</p>}
        {products.data && (!chosen || term) && (
          matches.length ? <>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {matches.slice(0, productLimit).map((product) => (
                <li key={product.id}>
                  <Link to="/admin/stok-hareketleri" search={{ urun: product.id }} resetScroll={false}
                    onClick={() => setSearch("")} className="flex h-full items-center gap-2 rounded-md border p-2.5 text-sm hover:border-accent hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-ring">
                    {product.sku && <span className="shrink-0 font-oem text-xs text-muted-foreground">{product.sku}</span>}
                    <span className="min-w-0 wrap-break-word font-medium">{product.name}</span>
                    <ArrowDownUp aria-hidden="true" className="ml-auto h-4 w-4 shrink-0 text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
            {matches.length > productLimit && <p className="text-xs text-muted-foreground">{numbers.format(matches.length)} ürün eşleşti. Daha fazla sonuç için aramayı daraltın.</p>}
          </> : <p role="status" className="text-sm text-muted-foreground">Eşleşen ürün bulunamadı.</p>
        )}
      </section>
      {chosen && <MovementHistory key={chosen.id} product={chosen} />}
    </div>
  );
}

function MovementHistory({ product }: { product: MovementProduct }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [direction, setDirection] = useState("all");
  const [pageIndex, setPageIndex] = useState(0);
  const invalid = Boolean(from && to && from > to);
  const history = useQuery(stockMovementsQuery(product.id, from, to));
  const sources = useQuery(procurementMovementLinksQuery(product.id));
  const sourceIndex = new Map((sources.data ?? []).map((entry) => [entry.product_revision, entry]));
  const data = history.data;
  const movements = data?.movements ?? [];
  const rows = movements.filter(({ delta }) => direction === "all" || (
    delta === null ? direction === "opening" : delta > 0 ? direction === "increase" : direction === "decrease"
  ));
  const lastPage = Math.max(0, Math.ceil(rows.length / PAGE_SIZE) - 1);
  const page = Math.min(pageIndex, lastPage);
  const totals = rows.reduce((sum, { delta }) => ({
    added: sum.added + Math.max(0, delta ?? 0),
    removed: sum.removed + Math.max(0, -(delta ?? 0)),
  }), { added: 0, removed: 0 });

  function exportHistory() {
    if (!data) return;
    const csvRows = stockMovementCsvRows(rows, product, data.actors);
    downloadCsv(`stok-hareketleri-${slugify(product.sku ?? product.id) || product.id}.csv`, [...stockMovementCsvHeader, "Kaynak belge"],
      csvRows.map((row, index) => {
        const source = sourceIndex.get(rows[index]?.revision ?? -1);
        return [...row, source ? `Kabul #${source.receipt_no}${source.reversal_id ? " (ters kayıt)" : ""}` : ""];
      }));
  }

  return (
    <section aria-labelledby="movement-product-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          {product.sku && <p className="font-oem text-xs text-muted-foreground">KM No {product.sku}</p>}
          <h2 id="movement-product-title" className="text-lg font-extrabold">{product.name}</h2>
        </div>
        <Button variant="outline" onClick={exportHistory} disabled={!rows.length || history.isFetching || sources.isFetching || invalid}><Download aria-hidden="true" />CSV indir</Button>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Mevcut stok" value={numbers.format(product.stock)} />
        {history.data && !invalid && <>
          <Stat label="Listelenen hareket" value={numbers.format(rows.length)} />
          <Stat label="Stok artışı · adet" value={numbers.format(totals.added)} tone={totals.added ? "text-emerald-800" : ""} />
          <Stat label="Stok azalışı · adet" value={numbers.format(totals.removed)} tone={totals.removed ? "text-destructive" : ""} />
        </>}
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="movement-from">Başlangıç tarihi</Label><Input id="movement-from" type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPageIndex(0); }} /></div>
        <div className="space-y-2"><Label htmlFor="movement-to">Bitiş tarihi</Label><Input id="movement-to" type="date" value={to} onChange={(event) => { setTo(event.target.value); setPageIndex(0); }} /></div>
        <div className="space-y-2">
          <Label htmlFor="movement-direction">Hareket türü</Label>
          <select id="movement-direction" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={direction} onChange={(event) => { setDirection(event.target.value); setPageIndex(0); }}>
            {Object.entries(directions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {invalid && <p role="alert" className="text-sm text-destructive">Bitiş tarihi başlangıç tarihinden önce olamaz.</p>}
      {!invalid && history.isPending && <p role="status" className="text-sm text-muted-foreground">Stok hareketleri yükleniyor…</p>}
      {!invalid && history.isError && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
        {history.data ? "Hareketler yenilenemedi. Son yüklenen kayıtlar gösteriliyor." : "Stok hareketleri yüklenemedi."}
        <Button variant="outline" size="sm" disabled={history.isFetching} onClick={() => void history.refetch()}>Tekrar dene</Button>
      </div>}
      {sources.isError && <p role="alert" className="text-sm text-destructive">Kaynak belgeler yüklenemedi. <Button size="sm" variant="link" onClick={() => void sources.refetch()}>Tekrar dene</Button></p>}
      {!invalid && data && (rows.length ? <>
        <div className="overflow-x-auto rounded-lg border">
          <table aria-label="Ürün stok hareketleri" className="w-full bg-card text-sm">
            <thead className="bg-secondary text-left"><tr>
              <th scope="col" className="whitespace-nowrap p-3">Tarih ve saat</th>
              <th scope="col" className="whitespace-nowrap p-3">Hareket</th>
              <th scope="col" className="whitespace-nowrap p-3 text-right">Önceki stok</th>
              <th scope="col" className="whitespace-nowrap p-3 text-right">Değişim</th>
              <th scope="col" className="whitespace-nowrap p-3 text-right">Sonraki stok</th>
              <th scope="col" className="whitespace-nowrap p-3">İşlemi yapan</th>
              <th scope="col" className="whitespace-nowrap p-3">Kaynak belge</th>
            </tr></thead>
            <tbody>{rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((entry) => {
              const source = sourceIndex.get(entry.revision ?? -1);
              return <tr key={entry.id} className="border-t">
                <td className="whitespace-nowrap p-3"><time dateTime={entry.createdAt}>{auditTimestamp(entry.createdAt)}</time></td>
                <td className="min-w-40 p-3">{stockMovementLabel(entry.delta)}</td>
                <td className="p-3 text-right tabular-nums">{entry.before === null ? "—" : numbers.format(entry.before)}</td>
                <td className={`p-3 text-right font-semibold tabular-nums ${entry.delta === null ? "text-muted-foreground" : entry.delta > 0 ? "text-emerald-800" : "text-destructive"}`}>{entry.delta === null ? "—" : signed.format(entry.delta)}</td>
                <td className="p-3 text-right font-semibold tabular-nums">{numbers.format(entry.after)}</td>
                <td className="max-w-56 wrap-break-word p-3">{stockMovementActor(entry.actorId, data.actors)}</td>
                <td className="whitespace-nowrap p-3">{source ? <Link to="/admin/tedarikci-siparisleri/$id" params={{ id: source.order_id }}
                  search={{ kabul: source.receipt_id }} className="font-medium underline">Kabul #{source.receipt_no}{source.reversal_id ? " · Ters kayıt" : ""}</Link> : "—"}</td>
              </tr>
            })}</tbody>
          </table>
        </div>
        <Pager page={page} total={rows.length} onChange={setPageIndex} />
      </> : <p role="status" className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Seçilen filtrelerde stok hareketi bulunamadı.</p>)}
      <p className="text-xs text-muted-foreground">Kaynak belge bağlantıları, Mal Kabulü üzerinden kesinleştirilen kayıtlar için gösterilir.</p>
    </section>
  );
}
