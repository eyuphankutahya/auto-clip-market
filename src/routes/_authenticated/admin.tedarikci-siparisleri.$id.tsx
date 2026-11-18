import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { GoodsReceiptForm } from "@/components/site/GoodsReceiptForm";
import { SupplierOrderForm } from "@/components/site/SupplierOrderForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { auditTimestamp } from "@/lib/audit-history";
import { date, money } from "@/lib/format";
import { formatProcurementTotal, procurementOrderQuery, procurementReceiptLinesQuery, procurementStatuses, useProcurementCommand, type GoodsReceipt, type SupplierOrder, type SupplierOrderLine } from "@/lib/supplier-procurement";

const uuid = z.string().uuid();
export const Route = createFileRoute("/_authenticated/admin/tedarikci-siparisleri/$id")({
  validateSearch: z.object({ kabul: uuid.optional().catch(undefined) }),
  component: SupplierOrderPage,
});

const actionLabels = {
  create: "Taslak oluşturuldu", edit: "Taslak düzenlendi", send: "Gönderildi", cancel: "İptal edildi",
  close: "Kalanı kapatıldı", reopen: "Yeniden açıldı", increase: "Sipariş adedi artırıldı",
  receive: "Mal kabulü kesinleşti", reverse: "Mal kabulü ters kaydedildi",
};
type Confirmation = { action: "send" | "cancel" | "close" | "reopen" }
  | { action: "increase"; line: SupplierOrderLine }
  | { action: "reverse"; receipt: GoodsReceipt };
const confirmationLabels = {
  send: "Gönderildi olarak işaretle", cancel: "Siparişi iptal et", close: "Kalanı kapat",
  reopen: "Siparişi yeniden aç", increase: "Sipariş adedini artır", reverse: "Ters kayıt oluştur",
};

function SupplierOrderPage() {
  const { id } = Route.useParams();
  if (!uuid.safeParse(id).success) return <p role="alert">Sipariş numarası geçersiz.</p>;
  return <SupplierOrderDetail key={id} id={id} />;
}

function SupplierOrderDetail({ id }: { id: string }) {
  const { adminUserId } = Route.useRouteContext();
  const { kabul } = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useQuery(procurementOrderQuery(id));
  const command = useProcurementCommand(adminUserId);
  const [editing, setEditing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [reason, setReason] = useState("");
  const [quantity, setQuantity] = useState("");
  const hasSelectedReceipt = query.data?.receipts.some((receipt) => receipt.id === kabul) ?? false;
  useEffect(() => {
    if (kabul && hasSelectedReceipt) document.getElementById(`kabul-${kabul}`)?.scrollIntoView({ block: "nearest" });
  }, [kabul, hasSelectedReceipt]);

  function ask(next: Confirmation) {
    command.clearError();
    setReason("");
    setQuantity(next.action === "increase" ? String(next.line.ordered_qty + 1) : "");
    setConfirmation(next);
  }

  if (!query.data) return <div className="space-y-3">
    <Link to="/admin/tedarikci-siparisleri" className="text-sm font-semibold underline">Tedarikçi siparişlerine dön</Link>
    {query.isPending && <p role="status">Sipariş yükleniyor…</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">{query.error.message} <Button variant="link" onClick={() => void query.refetch()}>Tekrar dene</Button></p>}
    {query.data === null && <p role="status">Sipariş bulunamadı.</p>}
  </div>;

  const { order, lines, receipts, events, actors } = query.data;
  const draft = order.status === "draft";
  const open = order.status === "ordered" || order.status === "partial";
  const sent = open || order.status === "received";
  const remaining = order.ordered_qty - order.received_qty;
  const selectedReceipt = receipts.find((receipt) => receipt.id === kabul);
  const setReceipt = (id: string | undefined) => void navigate({ search: id ? { kabul: id } : {}, replace: true, resetScroll: false });

  async function confirmAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmation || command.busy) return;
    const result = await command.execute(confirmation.action, {
      order_id: order.id, revision: order.revision, reason: reason.trim(),
      ...(confirmation.action === "increase" ? { line_id: confirmation.line.id, quantity: Number(quantity) } : {}),
      ...(confirmation.action === "reverse" ? { receipt_id: confirmation.receipt.id } : {}),
    });
    if (result) setConfirmation(null);
  }

  return <div className="min-w-0 space-y-5">
    <Link to="/admin/tedarikci-siparisleri" className="text-sm font-semibold underline">Tedarikçi siparişlerine dön</Link>
    <section className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4" aria-label="Tedarikçi siparişi özeti">
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold">#{order.order_no} · {order.supplier_name}</h2>
        <p className="text-sm font-semibold text-primary">{procurementStatuses[order.status]}</p>
        <p className="text-sm text-muted-foreground">Kayıt {date(order.created_at)}{order.sent_at && ` · Gönderim ${date(order.sent_at)}`}{order.expected_date && ` · Beklenen teslim ${date(order.expected_date)}`}</p>
        {order.notes && <p className="whitespace-pre-wrap text-sm">{order.notes}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {!editing && <Button variant="outline" size="sm" onClick={() => printOrder(order, lines)}><Printer />Siparişi yazdır</Button>}
        {draft && !editing && <>
          <Button size="sm" variant="outline" onClick={() => { command.clearError(); setEditing(true); }}>Taslağı düzenle</Button>
          <Button size="sm" onClick={() => ask({ action: "send" })}>Gönderildi olarak işaretle</Button>
        </>}
        {open && !receiving && <Button size="sm" onClick={() => { command.clearError(); setReceiving(true); }}>Mal kabulü başlat</Button>}
        {!editing && !receiving && <>
          {(draft || (open && receipts.length === 0)) && <Button size="sm" variant="outline" onClick={() => ask({ action: "cancel" })}>Siparişi iptal et</Button>}
          {open && remaining > 0 && <Button size="sm" variant="outline" onClick={() => ask({ action: "close" })}>Kalanı kapat</Button>}
          {order.status === "closed" && <Button size="sm" variant="outline" onClick={() => ask({ action: "reopen" })}>Siparişi yeniden aç</Button>}
        </>}
      </div>
    </section>
    {query.isError && <p role="alert" className="text-sm text-destructive">Sipariş yenilenemedi. Son yüklenen bilgiler gösteriliyor. <Button variant="link" onClick={() => void query.refetch()}>Tekrar dene</Button></p>}
    {!confirmation && command.error && <p role="alert" className="rounded-md border bg-card p-3 text-sm text-destructive">{command.error}</p>}
    {receiving && open && <GoodsReceiptForm lines={lines} busy={command.busy} onCancel={() => { command.clearError(); setReceiving(false); }}
      onSave={async (payload) => {
        const result = await command.execute("receive", { ...payload, order_id: id });
        if (result) { setReceiving(false); setReceipt(result.receipt_id); }
      }} />}
    {editing ? <SupplierOrderForm order={order} initialLines={lines} ownerId={adminUserId} busy={command.busy}
      actions={<Button type="button" variant="outline" disabled={command.busy} onClick={() => { command.clearError(); setEditing(false); }}>Vazgeç</Button>}
      onSave={async (payload) => { if (await command.execute("edit", payload)) setEditing(false); }} />
      : <div className="overflow-x-auto rounded-lg border">
        <table aria-label="Sipariş ve teslim durumu" className="w-full bg-card text-sm">
          <thead className="bg-secondary text-left"><tr>{["Ürün", "Firma kodu", "Sipariş", "Teslim", order.status === "closed" ? "Kapatılan" : "Açık adet", "Tahmini birim fiyat", ""].map((value) => <th key={value} scope="col" className="whitespace-nowrap p-3">{value}</th>)}</tr></thead>
          <tbody>{lines.map((line) => <tr key={line.id} className="border-t">
            <th scope="row" className="min-w-44 p-3 text-left font-medium">{line.sku && `${line.sku} · `}{line.product_name}</th>
            <td className="p-3 font-oem">{line.supplier_code ?? "—"}</td><td className="p-3 tabular-nums">{line.ordered_qty}</td><td className="p-3 tabular-nums">{line.received_qty}</td>
            <td className="p-3 tabular-nums">{order.status === "cancelled" ? "—" : line.ordered_qty - line.received_qty}</td>
            <td className="whitespace-nowrap p-3">{line.expected_cost === null ? "—" : money(line.expected_cost)}</td>
            <td className="p-3">{sent && !receiving && <Button size="sm" variant="ghost" aria-label={`${line.product_name} sipariş adedini artır`} disabled={line.ordered_qty >= 2147483647} onClick={() => ask({ action: "increase", line })}>Adedi artır</Button>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    {!draft && <section className="space-y-3" aria-labelledby="goods-history-title">
      <h3 id="goods-history-title" className="font-extrabold">Mal kabul geçmişi</h3>
      {receipts.length === 0 && <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Henüz kesinleşmiş mal kabulü yok.</p>}
      {receipts.map((receipt) => <div key={receipt.id} id={`kabul-${receipt.id}`} className="scroll-mt-36 rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><p className="font-semibold">Kabul #{receipt.receipt_no} · İrsaliye {receipt.document_no}</p>
            <p className="text-xs text-muted-foreground">Belge {date(receipt.document_date)} · Teslim {date(receipt.received_date)}{receipt.reversed_at && ` · Ters kayıt ${auditTimestamp(receipt.reversed_at)}`}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" aria-expanded={kabul === receipt.id} onClick={() => setReceipt(kabul === receipt.id ? undefined : receipt.id)}>{kabul === receipt.id ? "Kalemleri kapat" : "Kalemleri gör"}</Button>
            {!receipt.reversed_at && !receiving && <Button size="sm" variant="outline" onClick={() => ask({ action: "reverse", receipt })}>Ters kayıt</Button>}
          </div>
        </div>
        {selectedReceipt?.id === receipt.id && <ReceiptDetails receipt={receipt} lines={lines} />}
      </div>)}
    </section>}

    <section className="space-y-2" aria-labelledby="procurement-events-title">
      <h3 id="procurement-events-title" className="font-extrabold">İşlem geçmişi</h3>
      <ul className="divide-y rounded-md border bg-card text-sm">{events.map((event) => <li key={event.id} className="p-3">
        <p className="font-semibold">{actionLabels[event.action]}</p>
        <p className="text-xs text-muted-foreground">{auditTimestamp(event.created_at)} · {actors.get(event.actor_id) ?? event.actor_id}</p>
        {event.reason && <p className="mt-1 break-words">{event.reason}</p>}
      </li>)}</ul>
    </section>

    <Dialog open={!!confirmation} onOpenChange={(shown) => { if (!shown && !command.busy) { setConfirmation(null); command.clearError(); } }}>
      <DialogContent>
        {confirmation && <form onSubmit={confirmAction} className="space-y-4">
          <DialogHeader><DialogTitle>{confirmationLabels[confirmation.action]}</DialogTitle>
            <DialogDescription>{confirmation.action === "reverse" ? "Bu belgedeki tüm kalemler için stoktan düşen ters kayıt oluşturulur." : "İşlem, sipariş geçmişine yönetici ve zaman bilgisiyle eklenir."}</DialogDescription>
          </DialogHeader>
          {confirmation.action === "increase" && <div className="space-y-2"><Label htmlFor="procurement-new-quantity">Yeni sipariş adedi · {confirmation.line.product_name}</Label>
            <Input id="procurement-new-quantity" type="number" min={confirmation.line.ordered_qty + 1} max={2147483647} step={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div>}
          {confirmation.action !== "send" && <div className="space-y-2"><Label htmlFor="procurement-reason">Gerekçe</Label><Textarea id="procurement-reason" required maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></div>}
          {command.error && <p role="alert" className="text-sm text-destructive">{command.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={command.busy} onClick={() => { setConfirmation(null); command.clearError(); }}>Vazgeç</Button>
            <Button type="submit" disabled={command.busy || (confirmation.action !== "send" && !reason.trim())}>{command.busy ? "Kaydediliyor…" : "Onayla"}</Button>
          </div>
        </form>}
      </DialogContent>
    </Dialog>
  </div>;
}

function ReceiptDetails({ receipt, lines }: { receipt: GoodsReceipt; lines: SupplierOrderLine[] }) {
  const query = useQuery(procurementReceiptLinesQuery(receipt.id));
  if (query.isPending) return <p role="status" className="mt-2 text-sm">Kabul kalemleri yükleniyor…</p>;
  if (query.isError) return <p role="alert" className="mt-2 text-sm text-destructive">Kabul kalemleri yüklenemedi. <Button variant="link" onClick={() => void query.refetch()}>Tekrar dene</Button></p>;
  const names = new Map(lines.map((line) => [line.id, line.product_name]));
  const totalCents = query.data.reduce((sum, line) => sum + BigInt(line.quantity) * BigInt(Math.round(line.unit_cost * 100)), 0n);
  return <div className="mt-3 overflow-x-auto">
    <table aria-label={`Kabul ${receipt.receipt_no} kalemleri`} className="w-full text-sm">
      <thead className="bg-secondary text-left"><tr><th className="p-2">Ürün</th><th className="p-2">Adet</th><th className="p-2">Birim fiyat</th></tr></thead>
      <tbody>{query.data.map((line) => <tr className="border-t" key={line.id}><td className="p-2">{names.get(line.order_line_id) ?? "—"}</td><td className="p-2">{line.quantity}</td><td className="p-2">{money(line.unit_cost)}</td></tr>)}</tbody>
    </table>
    <p className="mt-2 text-sm font-semibold">Belge toplamı {formatProcurementTotal(totalCents)}</p>
  </div>;
}

function printOrder(order: SupplierOrder, lines: SupplierOrderLine[]) {
  const view = window.open("", "_blank", "width=900,height=750");
  if (!view) return;
  const esc = (value: string) => value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
  view.opener = null;
  view.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Tedarikçi siparişi #${order.order_no}</title><style>body{font-family:system-ui;margin:32px}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ccc;padding:8px;text-align:left}p{white-space:pre-wrap}</style></head><body><h1>KlipsMarket · Tedarikçi siparişi #${order.order_no}</h1><p>${esc(order.supplier_name)} · ${procurementStatuses[order.status]}${order.expected_date ? ` · Beklenen teslim ${date(order.expected_date)}` : ""}</p><p>${esc(order.notes)}</p><table><thead><tr><th>KM No</th><th>Ürün</th><th>Firma kodu</th><th>Adet</th><th>Tahmini birim fiyat</th></tr></thead><tbody>${lines.map((line) => `<tr><td>${esc(line.sku ?? "—")}</td><td>${esc(line.product_name)}</td><td>${esc(line.supplier_code ?? "—")}</td><td>${line.ordered_qty}</td><td>${line.expected_cost === null ? "—" : money(line.expected_cost)}</td></tr>`).join("")}</tbody></table></body></html>`);
  view.document.close();
  view.print();
}
