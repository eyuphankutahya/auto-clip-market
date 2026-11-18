import { pendingOrderStock } from "@/lib/admin-order-demand";

const columns = ["Ürün", "Bu sipariş", "Mevcut stok", "Diğer bekleyen", "Toplam bekleyen", "Durum"];
const numbers = new Intl.NumberFormat("tr-TR");

export function PendingOrderStock({ rows }: { rows: ReturnType<typeof pendingOrderStock> }) {
  if (!rows.length) return null;
  return (
    <section aria-labelledby="pending-stock-heading" className="space-y-2">
      <h3 id="pending-stock-heading" className="font-semibold">Stok ve bekleyen talep</h3>
      <p className="text-xs text-muted-foreground">Toplam bekleyen adet, bu siparişi ve diğer onay bekleyen siparişleri içerir.</p>
      <div className="overflow-x-auto rounded-md border">
        <table aria-labelledby="pending-stock-heading" className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>{columns.map((column, index) => <th key={column} scope="col" className={`whitespace-nowrap px-3 py-2 ${index > 0 && index < 5 ? "text-right" : "text-left"}`}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const message = row.unavailable ? "Satışa uygun değil"
                : row.insufficient ? "Bu siparişe stok yetersiz"
                : row.competing ? "Toplam talep stoğu aşıyor"
                : row.total === null || row.stock === null ? "Talep doğrulanamadı"
                : "Stok yeterli";
              return (
                <tr key={row.id} className="border-t">
                  <th scope="row" className="min-w-36 px-3 py-2 text-left font-medium">{row.sku && <span className="mr-1 text-xs text-muted-foreground">{row.sku}</span>}{row.name}</th>
                  {[row.requested, row.stock, row.others, row.total].map((value, index) => <td key={index} className="px-3 py-2 text-right tabular-nums">{value === null ? "—" : numbers.format(value)}</td>)}
                  <td className={`min-w-28 px-3 py-2 font-medium ${row.unavailable || row.insufficient ? "text-destructive" : row.competing ? "text-amber-900" : "text-muted-foreground"}`}>{message}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
