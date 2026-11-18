import { Download, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compareProductCodes } from "@/lib/catalog-rules";
import { changePurchaseQuantity, isPurchaseQuantity } from "@/lib/purchase-quantity";
import { groupPurchaseLines, purchaseLine, type PurchaseLine, type PurchaseProduct } from "@/lib/purchase-list";
import type { PurchaseDraftChange } from "@/lib/purchase-draft";

type Props = {
  lines: PurchaseLine[];
  products: PurchaseProduct[];
  onChange: (change: PurchaseDraftChange) => void;
  onDownload: () => void;
  exporting: boolean;
  disabled: boolean;
};

const maxQuantity = Number.MAX_SAFE_INTEGER - (Number.MAX_SAFE_INTEGER % 100);

export function ShortagePurchaseList({ lines, products, onChange, onDownload, exporting, disabled }: Props) {
  const groups = groupPurchaseLines([...lines].sort((a, b) => compareProductCodes({ sku: a.sku, id: a.productId }, { sku: b.sku, id: b.productId })));
  const productsById = new Map(products.map((product) => [product.id, product]));
  const setQuantity = (line: PurchaseLine, quantity: number) => onChange({ upsert: [{ ...line, quantity }] });
  return <section className="space-y-4 border-t pt-5" aria-label="Alım listesi">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold">Alım listesi <span className="text-sm font-normal text-muted-foreground">{lines.length} ürün · {groups.length} tedarikçi</span></h2>
      <Button onClick={onDownload} disabled={!lines.length || exporting || disabled}><Download />{exporting ? "Hazırlanıyor…" : "Alım listesini indir"}</Button>
    </div>
    {!lines.length && <p className="py-6 text-muted-foreground">Alım listesi boş.</p>}
    {groups.map((group) => <div key={group.supplierId} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">{group.name} <span className="text-sm font-normal text-muted-foreground">· {group.lines.length} ürün · {group.lines.reduce((n, l) => n + l.quantity, 0)} adet</span></h3>
        <Button asChild size="sm" variant="outline"><a href={`/admin/tedarikci-siparisleri/yeni?tedarikci=${encodeURIComponent(group.supplierId)}`}>Tedarikçi siparişi oluştur</a></Button>
      </div>
      <div className="overflow-x-auto rounded-md border"><table className="w-full bg-card text-sm">
        <thead className="bg-secondary text-left"><tr>{["KM No", "Ürün", "Tedarikçi", "Firma kodu", "Alım adedi", ""].map((h) => <th key={h} className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead>
        <tbody>{group.lines.map((line) => {
          const product = productsById.get(line.productId);
          const suppliers = product ? [...new Map(product.suppliers.map((s) => [s.supplier_id, s])).values()] : [];
          return <tr key={line.productId} className="border-t align-top">
            <td className="px-3 py-3 font-oem">{line.sku ?? "—"}</td><td className="min-w-48 px-3 py-3 font-semibold">{line.name}</td>
            <td className="px-3 py-3"><select className="h-9 w-40 rounded-md border bg-background px-2" aria-label={`${line.sku ?? line.name} liste tedarikçisi`} disabled={disabled || !suppliers.length} value={line.supplierId} onChange={(e) => {
              if (!product) return;
              const updated = purchaseLine(product, e.target.value, line.quantity);
              onChange({ upsert: [updated] });
            }}>{!suppliers.some((s) => s.supplier_id === line.supplierId) && <option value={line.supplierId} hidden>{line.supplierName}</option>}{suppliers.map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}</select></td>
            <td className="min-w-28 px-3 py-3 font-oem">{line.codes.join(" · ") || "—"}</td>
            <td className="px-3 py-3"><div className="flex items-center gap-1">
              <Button size="icon" variant="outline" title="100 azalt" aria-label={`${line.sku ?? line.name} alım adedini 100 azalt`} disabled={disabled || line.quantity === 100} onClick={() => setQuantity(line, changePurchaseQuantity(line.quantity, -1))}><Minus /></Button>
              <Input className="w-24 text-center" type="number" min={100} max={maxQuantity} step={100} readOnly={disabled} value={line.quantity} aria-label={`${line.sku ?? line.name} liste alım adedi`} onChange={(e) => { const quantity = Number(e.target.value); if (isPurchaseQuantity(quantity)) setQuantity(line, quantity); }} />
              <Button size="icon" variant="outline" title="100 artır" aria-label={`${line.sku ?? line.name} alım adedini 100 artır`} disabled={disabled || line.quantity >= maxQuantity} onClick={() => setQuantity(line, changePurchaseQuantity(line.quantity, 1, maxQuantity))}><Plus /></Button>
            </div></td>
            <td className="px-3 py-3"><Button variant="ghost" size="icon" title="Listeden çıkar" aria-label={`${line.sku ?? line.name} listeden çıkar`} disabled={disabled} onClick={() => onChange({ remove: line.productId })}><Trash2 /></Button></td>
          </tr>;
        })}</tbody>
      </table></div>
    </div>)}
  </section>;
}
