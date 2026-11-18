import { Download, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compareProductCodes } from "@/lib/catalog-rules";
import { changePurchaseQuantity, isPurchaseQuantity } from "@/lib/purchase-quantity";
import { groupPurchaseLines, purchaseLine, type PurchaseLine, type PurchaseProduct } from "@/lib/purchase-list";

type Props = { lines: PurchaseLine[]; products: PurchaseProduct[]; onChange: (lines: PurchaseLine[]) => void; onDownload: () => void; exporting: boolean };

export function ShortagePurchaseList({ lines, products, onChange, onDownload, exporting }: Props) {
  const groups = groupPurchaseLines([...lines].sort((a, b) => compareProductCodes({ sku: a.sku, id: a.productId }, { sku: b.sku, id: b.productId })));
  const setQuantity = (productId: string, quantity: number) => onChange(lines.map((l) => l.productId === productId ? { ...l, quantity } : l));
  return <section className="space-y-4 border-t pt-5" aria-label="Alım listesi">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">Alım listesi <span className="text-sm font-normal text-muted-foreground">{lines.length} ürün · {groups.length} tedarikçi</span></h2>
      <Button onClick={onDownload} disabled={!lines.length || exporting}><Download />{exporting ? "Hazırlanıyor…" : "Alım listesini indir"}</Button>
    </div>
    {!lines.length && <p className="py-6 text-muted-foreground">Alım listesi boş.</p>}
    {groups.map((group) => <div key={group.supplierId} className="space-y-2">
      <h3 className="font-bold">{group.name} <span className="text-sm font-normal text-muted-foreground">· {group.lines.length} ürün · {group.lines.reduce((n, l) => n + l.quantity, 0)} adet</span></h3>
      <div className="overflow-x-auto rounded-md border"><table className="w-full bg-card text-sm">
        <thead className="bg-secondary text-left"><tr>{["KM No", "Ürün", "Tedarikçi", "Firma kodu", "Alım adedi", ""].map((h) => <th key={h} className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead>
        <tbody>{group.lines.map((line) => {
          const product = products.find((p) => p.id === line.productId);
          const suppliers = product ? [...new Map(product.suppliers.map((s) => [s.supplier_id, s])).values()] : [];
          return <tr key={line.productId} className="border-t align-top">
            <td className="px-3 py-3 font-oem">{line.sku ?? "—"}</td><td className="min-w-48 px-3 py-3 font-semibold">{line.name}</td>
            <td className="px-3 py-3"><select className="h-9 w-40 rounded-md border bg-background px-2" aria-label={`${line.sku ?? line.name} liste tedarikçisi`} value={line.supplierId} onChange={(e) => {
              if (!product) return;
              const updated = purchaseLine(product, e.target.value, line.quantity);
              onChange(lines.map((l) => l.productId === line.productId ? updated : l));
            }}><option value={line.supplierId} hidden>{line.supplierName}</option>{suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}</select></td>
            <td className="min-w-28 px-3 py-3 font-oem">{line.codes.join(" · ") || "—"}</td>
            <td className="px-3 py-3"><div className="flex items-center gap-1">
              <Button size="icon" variant="outline" title="100 azalt" aria-label={`${line.sku ?? line.name} alım adedini 100 azalt`} disabled={line.quantity === 100} onClick={() => setQuantity(line.productId, changePurchaseQuantity(line.quantity, -1))}><Minus /></Button>
              <Input className="w-24 text-center" type="number" min={100} step={100} value={line.quantity} aria-label={`${line.sku ?? line.name} liste alım adedi`} onChange={(e) => { const quantity = Number(e.target.value); if (isPurchaseQuantity(quantity)) setQuantity(line.productId, quantity); }} />
              <Button size="icon" variant="outline" title="100 artır" aria-label={`${line.sku ?? line.name} alım adedini 100 artır`} onClick={() => setQuantity(line.productId, changePurchaseQuantity(line.quantity, 1))}><Plus /></Button>
            </div></td>
            <td className="px-3 py-3"><Button variant="ghost" size="icon" title="Listeden çıkar" aria-label={`${line.sku ?? line.name} listeden çıkar`} onClick={() => onChange(lines.filter((l) => l.productId !== line.productId))}><Trash2 /></Button></td>
          </tr>;
        })}</tbody>
      </table></div>
    </div>)}
  </section>;
}
