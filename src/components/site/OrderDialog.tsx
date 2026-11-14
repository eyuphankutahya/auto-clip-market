import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STATUS, date, money } from "@/lib/format";

export type OrderDetails = {
  order_no: number;
  created_at: string;
  status: string;
  discount_rate: number;
  notes: string | null;
  total: number;
  items: {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    product: { sku: string | null } | null;
  }[];
};

export function OrderDialog({ order, onClose }: { order: OrderDetails | null; onClose: () => void }) {
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {order && <>
          <DialogHeader>
            <DialogTitle>Sipariş #{order.order_no}</DialogTitle>
            <DialogDescription>Sipariş bilgileri ve alınan tüm ürünler</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div><span className="text-muted-foreground">Tarih:</span> {date(order.created_at)}</div>
            <div><span className="text-muted-foreground">Durum:</span> {STATUS[order.status] ?? order.status}</div>
            <div><span className="text-muted-foreground">İskonto:</span> %{Number(order.discount_rate)}</div>
          </div>
          {order.notes && <p className="rounded-md bg-secondary p-3 text-sm"><span className="font-semibold">Not:</span> {order.notes}</p>}
          <div className="max-h-[50vh] overflow-auto border">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left"><tr><th className="p-2">KM No</th><th className="p-2">Ürün</th><th className="p-2 text-right">Adet</th><th className="p-2 text-right">Birim</th><th className="p-2 text-right">Tutar</th></tr></thead>
              <tbody>{order.items.map((item) => <tr key={item.id} className="border-t"><td className="p-2 font-oem">{item.product?.sku ?? "—"}</td><td className="p-2">{item.product_name}</td><td className="p-2 text-right">{item.quantity}</td><td className="whitespace-nowrap p-2 text-right">{money(item.unit_price)}</td><td className="whitespace-nowrap p-2 text-right">{money(item.quantity * Number(item.unit_price))}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="text-right font-display text-lg font-extrabold">Toplam: {money(order.total)}</div>
        </>}
      </DialogContent>
    </Dialog>
  );
}
