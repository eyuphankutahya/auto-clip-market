import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { date, istanbulDay } from "@/lib/format";
import { procurementListQuery, procurementStatuses, procurementSuppliersQuery, type ProcurementFilters } from "@/lib/supplier-procurement";

export const Route = createFileRoute("/_authenticated/admin/tedarikci-siparisleri/")({ component: SupplierOrders });

const initial: ProcurementFilters = { supplier: "", status: "", number: "", from: "", to: "" };
const numbers = new Intl.NumberFormat("tr-TR");
const selectStyle = "h-9 w-full rounded-md border bg-background px-2 text-sm";

function SupplierOrders() {
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(0);
  const suppliers = useQuery(procurementSuppliersQuery);
  const list = useQuery(procurementListQuery(filters, page, PAGE_SIZE));
  const invalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const today = istanbulDay();
  function filter<K extends keyof ProcurementFilters>(field: K, value: ProcurementFilters[K]) {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(0);
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap justify-end gap-2">
      <Button asChild variant="outline"><Link to="/admin/tedarikci-siparisleri/mal-kabulleri">Mal kabul geçmişi</Link></Button>
      <Button asChild><Link to="/admin/tedarikci-siparisleri/yeni" search={{}}><Plus />Yeni sipariş</Link></Button>
    </div>
    <section aria-label="Tedarikçi siparişi filtreleri" className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="space-y-2"><Label htmlFor="procurement-list-number">Sipariş no</Label><Input id="procurement-list-number" inputMode="numeric" maxLength={15} value={filters.number} onChange={(event) => filter("number", event.target.value.trim())} /></div>
      <div className="space-y-2"><Label htmlFor="procurement-list-supplier">Tedarikçi</Label><select id="procurement-list-supplier" className={selectStyle} value={filters.supplier} onChange={(event) => filter("supplier", event.target.value)}><option value="">Tüm tedarikçiler</option>{suppliers.data?.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="procurement-list-status">Durum</Label><select id="procurement-list-status" className={selectStyle} value={filters.status} onChange={(event) => filter("status", event.target.value as ProcurementFilters["status"])}><option value="">Tüm durumlar</option>{Object.entries(procurementStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="procurement-list-from">Kayıt başlangıcı</Label><Input type="date" id="procurement-list-from" value={filters.from} onChange={(event) => filter("from", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="procurement-list-to">Kayıt bitişi</Label><Input type="date" id="procurement-list-to" value={filters.to} onChange={(event) => filter("to", event.target.value)} /></div>
    </section>
    {invalid && <p role="alert" className="text-sm text-destructive">Bitiş tarihi başlangıçtan önce olamaz.</p>}
    {suppliers.isError && <p role="alert" className="text-sm text-destructive">Tedarikçi filtresi yüklenemedi. <Button variant="link" size="sm" onClick={() => void suppliers.refetch()}>Tekrar dene</Button></p>}
    {!invalid && list.isPending && <p role="status" className="text-sm text-muted-foreground">Tedarikçi siparişleri yükleniyor…</p>}
    {!invalid && list.isError && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-4 text-sm">{list.error.message} <Button variant="outline" size="sm" disabled={list.isFetching} onClick={() => void list.refetch()}>Tekrar dene</Button></div>}
    {!invalid && list.data && <>
      <div className="overflow-x-auto rounded-lg border">
        <table aria-label="Tedarikçi siparişleri" className="w-full bg-card text-sm">
          <thead className="bg-secondary text-left"><tr>{["Sipariş no", "Tedarikçi", "Kayıt tarihi", "Beklenen teslim", "Sipariş", "Teslim", "Açık adet", "Durum"].map((value) => <th key={value} scope="col" className="whitespace-nowrap p-3">{value}</th>)}</tr></thead>
          <tbody>{list.data.orders.map((order) => {
            const open = order.status === "ordered" || order.status === "partial";
            const overdue = open && !!order.expected_date && order.expected_date < today;
            return <tr key={order.id} className="border-t">
              <th scope="row" className="p-3 text-left"><Link to="/admin/tedarikci-siparisleri/$id" params={{ id: order.id }} search={{}} className="font-semibold underline underline-offset-2">#{order.order_no}</Link></th>
              <td className="min-w-36 p-3">{order.supplier_name}</td>
              <td className="whitespace-nowrap p-3">{date(order.created_at)}</td>
              <td className="whitespace-nowrap p-3">{order.expected_date ? date(order.expected_date) : "—"}{overdue && <span className="ml-2 font-medium text-destructive">Gecikti</span>}</td>
              <td className="p-3 tabular-nums">{numbers.format(order.ordered_qty)}</td>
              <td className="p-3 tabular-nums">{numbers.format(order.received_qty)}</td>
              <td className="p-3 tabular-nums">{open ? numbers.format(order.ordered_qty - order.received_qty) : "—"}</td>
              <td className="whitespace-nowrap p-3 font-medium">{procurementStatuses[order.status]}</td>
            </tr>;
          })}</tbody>
        </table>
        {!list.data.orders.length && <p role="status" className="p-5 text-sm text-muted-foreground">Bu filtrelerle sipariş bulunamadı.</p>}
      </div>
      <Pager page={page} total={list.data.total} onChange={setPage} />
    </>}
  </div>;
}
