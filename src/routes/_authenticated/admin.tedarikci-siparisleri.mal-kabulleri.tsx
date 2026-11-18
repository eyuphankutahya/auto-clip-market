import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { date } from "@/lib/format";
import { formatProcurementTotal, procurementReceiptListQuery, procurementSuppliersQuery } from "@/lib/supplier-procurement";

export const Route = createFileRoute("/_authenticated/admin/tedarikci-siparisleri/mal-kabulleri")({
  head: () => ({ meta: [{ title: "Mal Kabul Geçmişi — KlipsMarket" }] }),
  component: ReceiptHistory,
});
const defaults = { supplier: "", document: "", state: "", from: "", to: "" };
const selectStyle = "h-9 w-full rounded-md border bg-background px-2 text-sm";

function ReceiptHistory() {
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(0);
  const suppliers = useQuery(procurementSuppliersQuery);
  const history = useQuery(procurementReceiptListQuery(filters, page, PAGE_SIZE));
  const invalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  function filter(field: keyof typeof defaults, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(0);
  }

  return <section className="space-y-4" aria-labelledby="receipt-history-title">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id="receipt-history-title" className="text-xl font-extrabold">Mal kabul geçmişi</h2>
      <Button asChild size="sm" variant="outline"><Link to="/admin/tedarikci-siparisleri">Tedarikçi siparişlerine dön</Link></Button>
    </div>
    <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="space-y-2"><Label htmlFor="receipt-history-doc">İrsaliye numarası</Label><Input id="receipt-history-doc" maxLength={80} value={filters.document} onChange={(event) => filter("document", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="receipt-history-supplier">Tedarikçi</Label><select id="receipt-history-supplier" className={selectStyle} value={filters.supplier} onChange={(event) => filter("supplier", event.target.value)}><option value="">Tüm tedarikçiler</option>{suppliers.data?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="receipt-history-state">Durum</Label><select id="receipt-history-state" className={selectStyle} value={filters.state} onChange={(event) => filter("state", event.target.value)}><option value="">Tüm durumlar</option><option value="active">Kesinleşti</option><option value="reversed">Ters kaydedildi</option></select></div>
      <div className="space-y-2"><Label htmlFor="receipt-history-from">Teslim başlangıcı</Label><Input id="receipt-history-from" type="date" value={filters.from} onChange={(event) => filter("from", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="receipt-history-to">Teslim bitişi</Label><Input id="receipt-history-to" type="date" value={filters.to} onChange={(event) => filter("to", event.target.value)} /></div>
    </div>
    {suppliers.isError && <p role="alert" className="text-sm text-destructive">Tedarikçi filtresi yüklenemedi. <Button variant="link" size="sm" onClick={() => void suppliers.refetch()}>Tekrar dene</Button></p>}
    {invalid && <p role="alert" className="text-sm text-destructive">Bitiş tarihi başlangıçtan önce olamaz.</p>}
    {!invalid && history.isPending && <p role="status" className="text-sm text-muted-foreground">Mal kabulleri yükleniyor…</p>}
    {!invalid && history.isError && <p role="alert" className="text-sm text-destructive">{history.error.message} <Button size="sm" variant="link" onClick={() => void history.refetch()}>Tekrar dene</Button></p>}
    {!invalid && history.data && <>
      <div className="overflow-x-auto rounded-lg border"><table aria-label="Mal kabul kayıtları" className="w-full bg-card text-sm">
        <thead className="bg-secondary text-left"><tr>{["Kabul no", "Tedarikçi", "İrsaliye", "Teslim tarihi", "Adet", "Belge tutarı", "Durum"].map((value) => <th key={value} scope="col" className="whitespace-nowrap p-3">{value}</th>)}</tr></thead>
        <tbody>{history.data.receipts.map((receipt) => <tr key={receipt.id} className="border-t">
          <th scope="row" className="p-3 text-left"><Link to="/admin/tedarikci-siparisleri/$id" params={{ id: receipt.order_id }} search={{ kabul: receipt.id }} className="whitespace-nowrap underline">#{receipt.receipt_no}</Link></th>
          <td className="min-w-32 p-3">{receipt.supplier_name}</td><td className="p-3 font-oem">{receipt.document_no}</td>
          <td className="whitespace-nowrap p-3">{date(receipt.received_date)}</td><td className="p-3 tabular-nums">{receipt.quantity}</td>
          <td className="whitespace-nowrap p-3">{formatProcurementTotal(BigInt(receipt.total_cents))}</td>
          <td className="whitespace-nowrap p-3">{receipt.reversed_at ? "Ters kaydedildi" : "Kesinleşti"}</td>
        </tr>)}</tbody>
      </table>{history.data.receipts.length === 0 && <p role="status" className="p-5 text-sm text-muted-foreground">Bu filtrelerle mal kabulü bulunamadı.</p>}</div>
      <Pager page={page} total={history.data.total} onChange={setPage} />
    </>}
  </section>;
}
