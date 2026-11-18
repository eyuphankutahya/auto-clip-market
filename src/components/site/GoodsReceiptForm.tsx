import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { istanbulDay } from "@/lib/format";
import { formatProcurementTotal, type SupplierOrderLine } from "@/lib/supplier-procurement";

type ReceiptInput = { document_no: string; document_date: string; received_date: string; lines: { line_id: string; quantity: number; unit_cost: number }[] };

export function GoodsReceiptForm({ lines, busy, onSave, onCancel }: {
  lines: SupplierOrderLine[]; busy: boolean; onSave: (payload: ReceiptInput) => void; onCancel: () => void;
}) {
  const [documentNo, setDocumentNo] = useState("");
  const [documentDate, setDocumentDate] = useState(() => istanbulDay());
  const [received, setReceived] = useState(() => istanbulDay());
  const [entries, setEntries] = useState<Record<string, { quantity: string; cost: string }>>({});
  const open = lines.filter((line) => line.ordered_qty > line.received_qty);
  const selected = open.filter((line) => Number(entries[line.id]?.quantity ?? 0) > 0);
  const validAmounts = selected.every((line) => {
    const entry = entries[line.id];
    const quantity = Number(entry?.quantity), cost = Number(entry?.cost);
    return !!entry?.cost && Number.isSafeInteger(quantity) && quantity <= line.ordered_qty - line.received_qty && line.current_stock + quantity <= 2147483647 &&
      Number.isFinite(cost) && cost >= 0 && cost <= 9999999999.99 && Number(cost.toFixed(2)) === cost;
  });
  const total = validAmounts ? selected.reduce((cents, line) =>
    cents + BigInt(Number(entries[line.id]?.quantity)) * BigInt(Math.round(Number(entries[line.id]?.cost) * 100)), 0n) : null;

  return <form className="space-y-3" onSubmit={(event) => {
    event.preventDefault();
    if (!selected.length || !validAmounts || busy) return;
    onSave({ document_no: documentNo.trim(), document_date: documentDate, received_date: received,
      lines: selected.map((line) => ({ line_id: line.id, quantity: Number(entries[line.id]?.quantity), unit_cost: Number(entries[line.id]?.cost) })) });
  }}>
    <fieldset disabled={busy} className="space-y-4 rounded-lg border bg-card p-4">
      <h3 className="font-bold">Mal kabulü</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="receipt-doc">İrsaliye numarası</Label><Input id="receipt-doc" required maxLength={80} value={documentNo} onChange={(event) => setDocumentNo(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="receipt-doc-date">Belge tarihi</Label><Input id="receipt-doc-date" type="date" required value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="receipt-received">Teslim tarihi</Label><Input id="receipt-received" type="date" required value={received} onChange={(event) => setReceived(event.target.value)} /></div>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table aria-label="Mal kabul kalemleri" className="w-full text-sm">
          <thead className="bg-secondary text-left"><tr>{["Ürün", "Kalan", "Mevcut stok", "Gelen adet", "Kabul sonrası stok", "Gerçekleşen birim fiyat (₺)"].map((value) => <th key={value} className="whitespace-nowrap p-2.5" scope="col">{value}</th>)}</tr></thead>
          <tbody>{open.map((line) => {
            const entry = entries[line.id] ?? { quantity: "", cost: line.expected_cost === null ? "" : String(line.expected_cost) };
            const patch = (value: Partial<typeof entry>) => setEntries((current) => ({ ...current, [line.id]: { ...entry, ...value } }));
            const remaining = line.ordered_qty - line.received_qty;
            const incoming = Number(entry.quantity);
            const projected = Number.isSafeInteger(incoming) && incoming >= 0 && incoming <= remaining && line.current_stock + incoming <= 2147483647
              ? line.current_stock + incoming : null;
            return <tr key={line.id} className="border-t">
              <th scope="row" className="min-w-44 p-2.5 text-left font-medium">{line.sku && `${line.sku} · `}{line.product_name}</th>
              <td className="p-2.5 tabular-nums">{remaining}</td>
              <td className="p-2.5 tabular-nums">{line.current_stock}</td>
              <td className="p-2.5"><Input aria-label={`${line.product_name} gelen adet`} type="number" min={0} max={remaining} step={1} className="w-24" value={entry.quantity} onChange={(event) => patch({ quantity: event.target.value })} /></td>
              <td className="p-2.5 tabular-nums">{projected === null ? "—" : projected}</td>
              <td className="p-2.5"><Input aria-label={`${line.product_name} gerçekleşen fiyat`} type="number" min={0} max={9999999999.99} step="0.01" required={Number(entry.quantity) > 0} className="w-32" value={entry.cost} onChange={(event) => patch({ cost: event.target.value })} /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">{total === null ? "Gelen adetleri ve birim fiyatları kontrol edin." : <>Kesinleştirildiğinde stoğa {selected.reduce((sum, line) => sum + Number(entries[line.id]?.quantity), 0)} adet eklenecek. {selected.length > 0 && <>Kabul tutarı {formatProcurementTotal(total)}.</>}</>}</p>
      <p className="text-xs text-muted-foreground">Kabul sonrası stok, ekrandaki mevcut stok üzerinden hesaplanan önizlemedir.</p>
    </fieldset>
    <div className="flex gap-2">
      <Button type="submit" disabled={busy || !selected.length || !validAmounts || !documentNo.trim()}>{busy ? "Kaydediliyor…" : "Mal kabulünü kesinleştir"}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Vazgeç</Button>
    </div>
  </form>;
}
