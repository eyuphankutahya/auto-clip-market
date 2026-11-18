import { useState } from "react";
import { toast } from "sonner";
import { updateOrderStatuses } from "@/lib/admin-order-actions";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { eligibleOrderIds } from "@/lib/admin-rules";
import { STATUS } from "@/lib/format";
import { Check, Truck, X } from "lucide-react";

export function BulkOrderActions({ orders, onSaved, onClear }: { orders: { id: string; status: string; order_no: number }[]; onSaved: () => void; onClear: () => void }) {
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const eligible = target ? orders.filter(o => eligibleOrderIds(orders, target).includes(o.id)) : [];
  const save = async () => {
    if (!target || !eligible.length) return;
    setBusy(true);
    try {
      const count = await updateOrderStatuses(eligible, target);
      toast.success(`${count} sipariş güncellendi`); setTarget(null); onClear(); onSaved();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Kaydedilemedi"); }
    finally { setBusy(false); }
  };
  return <><div className="flex flex-wrap items-center gap-2 border-y bg-secondary/50 px-3 py-3"><span className="mr-auto text-sm font-semibold">{orders.length} sipariş seçildi</span>
    {[{ value: "approved", label: "Onayla", Icon: Check }, { value: "shipped", label: "Kargola", Icon: Truck }, { value: "cancelled", label: "İptal et", Icon: X }].map(({ value, label, Icon }) => <Button key={value} size="sm" variant={value === "cancelled" ? "outline" : "default"} disabled={!eligibleOrderIds(orders, value).length || busy} onClick={() => setTarget(value)}><Icon />{label} ({eligibleOrderIds(orders, value).length})</Button>)}
    <Button size="sm" variant="ghost" disabled={busy} onClick={onClear}>Seçimi temizle</Button></div>
    <AlertDialog open={Boolean(target)} onOpenChange={open => { if (!open && !busy) setTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{eligible.length} sipariş: {target ? STATUS[target] : ""}</AlertDialogTitle><AlertDialogDescription>Siparişler: {eligible.map(o => `#${o.order_no}`).join(", ")}. {target === "approved" ? "Stoklar düşer; cari siparişlerin tutarı borç olarak kaydedilir." : target === "cancelled" ? "Onaylı siparişlerin stoğu iade edilir ve cari borcu kaldırılır." : "Siparişler kargolandı olarak işaretlenir."} {orders.length !== eligible.length ? `${orders.length - eligible.length} uygun olmayan sipariş değiştirilmeyecek.` : ""}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Vazgeç</AlertDialogCancel><Button disabled={busy} onClick={save}>{busy ? "Kaydediliyor…" : "Onayla ve uygula"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
