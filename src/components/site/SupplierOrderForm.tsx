import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compareProductCodes } from "@/lib/catalog-rules";
import { draftOptions } from "@/lib/purchase-draft";
import { procurementProductsQuery, procurementSuppliersQuery, type SupplierOrder, type SupplierOrderLine } from "@/lib/supplier-procurement";
import type { Json } from "@/integrations/supabase/types";

type EditableLine = { id: string; sku: string | null; name: string; code: string; qty: string; cost: string };
const selectStyle = "h-9 w-full rounded-md border bg-background px-2 text-sm";

export function SupplierOrderForm({ order, initialLines = [], ownerId, initialSupplier = "", busy, onSave, actions }: {
  order?: SupplierOrder; initialLines?: SupplierOrderLine[]; ownerId: string; initialSupplier?: string;
  busy: boolean; onSave: (payload: Json) => void; actions?: ReactNode;
}) {
  const [supplier, setSupplier] = useState(order?.supplier_id ?? initialSupplier);
  const [expected, setExpected] = useState(order?.expected_date ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [search, setSearch] = useState("");
  const [loadDraft, setLoadDraft] = useState(false);
  const [lines, setLines] = useState<EditableLine[]>(() => initialLines.map((line) => ({
    id: line.product_id, sku: line.sku, name: line.product_name, code: line.supplier_code ?? "",
    qty: String(line.ordered_qty), cost: line.expected_cost === null ? "" : String(line.expected_cost),
  })));
  const suppliers = useQuery({ ...procurementSuppliersQuery, enabled: !order });
  const products = useQuery(procurementProductsQuery(supplier));
  const draft = useQuery({ ...draftOptions(ownerId), enabled: loadDraft && !!supplier });
  const availableDraft = (draft.data ?? []).filter((line) => line.supplierId === supplier && !lines.some(({ id }) => id === line.productId));
  const term = search.trim().toLocaleLowerCase("tr");
  const options = (products.data ?? []).filter((product) =>
    !lines.some(({ id }) => id === product.id) && [product.name, product.sku ?? "", ...product.codes].some((value) => value.toLocaleLowerCase("tr").includes(term)),
  ).sort(compareProductCodes).slice(0, 10);
  const productIndex = new Map((products.data ?? []).map((product) => [product.id, product]));
  const invalidLinks = !!products.data && lines.some((line) => {
    const linked = productIndex.get(line.id);
    return !linked || (!!line.code && !linked.codes.includes(line.code));
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supplier || !lines.length || invalidLinks || busy) return;
    const payloadLines = lines.map(({ id, code, qty, cost }) => ({
      product_id: id, supplier_code: code || null, quantity: Number(qty), expected_cost: cost === "" ? null : Number(cost),
    }));
    onSave({
      supplier_id: supplier, expected_date: expected || null, notes: notes.trim(), lines: payloadLines,
      ...(order ? { order_id: order.id, revision: order.revision } : {}),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy} className="space-y-5 rounded-lg border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {!order && <div className="space-y-2"><Label htmlFor="procurement-supplier">Tedarikçi</Label>
            <select required id="procurement-supplier" className={selectStyle} value={supplier} disabled={lines.length > 0} onChange={(event) => { setSupplier(event.target.value); setLoadDraft(false); setSearch(""); }}>
              <option value="">{suppliers.isPending ? "Tedarikçiler yükleniyor…" : "Tedarikçi seçin"}</option>
              {suppliers.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {suppliers.isError && <p role="alert" className="text-sm text-destructive">Tedarikçiler yüklenemedi. <Button type="button" size="sm" variant="link" onClick={() => void suppliers.refetch()}>Tekrar dene</Button></p>}
          </div>}
          <div className="space-y-2"><Label htmlFor="procurement-expected">Beklenen teslim tarihi</Label><Input id="procurement-expected" type="date" value={expected} onChange={(event) => setExpected(event.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="procurement-notes">Tedarikçiye iletilecek not</Label><Textarea id="procurement-notes" maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>

        {supplier && <div className="space-y-3 border-t pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-full max-w-sm space-y-2"><Label htmlFor="procurement-search">Ürün ekle</Label><Input id="procurement-search" type="search" placeholder="KM No, ürün veya firma kodu" maxLength={150} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
            <Button type="button" size="sm" variant="outline" onClick={() => setLoadDraft((shown) => !shown)} aria-expanded={loadDraft}>Alım taslağından getir</Button>
          </div>
          {loadDraft && <div className="rounded-md border bg-secondary/40 p-3 text-sm">
            {draft.isPending && <p role="status">Alım taslağı yükleniyor…</p>}
            {draft.isError && <p role="alert">Alım taslağı yüklenemedi. Ürünleri elle ekleyebilirsiniz.</p>}
            {draft.data && (availableDraft.length ? <Button type="button" size="sm" variant="outline"
              disabled={availableDraft.length + lines.length > 100}
              onClick={() => { setLines([...lines, ...availableDraft.map((line) => ({
                id: line.productId, sku: line.sku, name: line.name, code: line.codes.length === 1 ? line.codes[0]! : "", qty: String(line.quantity), cost: "",
              }))]); setLoadDraft(false); }}>{availableDraft.length} ürünü siparişe ekle</Button> : <p>Bu tedarikçi için aktarılacak ürün yok.</p>)}
            {availableDraft.length + lines.length > 100 && <p className="mt-2">Bir sipariş en fazla 100 farklı ürün içerebilir.</p>}
          </div>}
          {products.isPending && <p role="status" className="text-sm text-muted-foreground">Tedarikçi ürünleri yükleniyor…</p>}
          {products.isError && <p role="alert" className="text-sm text-destructive">Tedarikçi ürünleri yüklenemedi. <Button type="button" size="sm" variant="link" onClick={() => void products.refetch()}>Tekrar dene</Button></p>}
          {options.length > 0 && <ul className="grid gap-2 sm:grid-cols-2">
            {options.map((product) => <li key={product.id}><Button type="button" variant="outline" className="h-auto w-full justify-start whitespace-normal text-left"
              disabled={lines.length >= 100} onClick={() => setLines((current) => [...current, { id: product.id, sku: product.sku, name: product.name, code: product.codes.length === 1 ? product.codes[0]! : "", qty: "100", cost: "" }])}>
              <Plus aria-hidden="true" />{product.sku && `${product.sku} · `}{product.name}
            </Button></li>)}
          </ul>}
          {products.data && !options.length && <p className="text-sm text-muted-foreground">Eklenebilecek eşleşen ürün yok.</p>}
        </div>}

        {lines.length > 0 && <div className="overflow-x-auto rounded-md border">
          <table aria-label="Tedarikçi siparişi kalemleri" className="w-full text-sm">
            <thead className="bg-secondary text-left"><tr>{["Ürün", "Firma kodu", "Adet", "Tahmini birim fiyat (₺)", ""].map((label) => <th key={label} scope="col" className="whitespace-nowrap p-2.5">{label}</th>)}</tr></thead>
            <tbody>{lines.map((line) => {
              const codes = productIndex.get(line.id)?.codes ?? [];
              const patch = (value: Partial<EditableLine>) => setLines((current) => current.map((item) => item.id === line.id ? { ...item, ...value } : item));
              return <tr key={line.id} className="border-t">
                <th scope="row" className="min-w-48 p-2.5 text-left font-medium">{line.sku && `${line.sku} · `}{line.name}</th>
                <td className="p-2.5"><select value={line.code} onChange={(event) => patch({ code: event.target.value })} className={`${selectStyle} min-w-28`} aria-label={`${line.name} firma kodu`}><option value="">Belirtilmedi</option>
                  {line.code && !codes.includes(line.code) && <option value={line.code}>{line.code} (eski)</option>}
                  {codes.map((code) => <option key={code} value={code}>{code}</option>)}</select></td>
                <td className="p-2.5"><Input type="number" min={1} max={2147483647} step={1} required className="w-24" value={line.qty} aria-label={`${line.name} sipariş adedi`} onChange={(event) => patch({ qty: event.target.value })} /></td>
                <td className="p-2.5"><Input type="number" min={0} max={9999999999.99} step="0.01" className="w-32" value={line.cost} aria-label={`${line.name} tahmini fiyatı`} onChange={(event) => patch({ cost: event.target.value })} /></td>
                <td className="p-2.5"><Button type="button" size="icon" variant="ghost" aria-label={`${line.name} çıkar`} onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}><Trash2 /></Button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>}
        {invalidLinks && <p role="alert" className="text-sm text-destructive">Tedarikçi bağlantısı güncel olmayan ürün veya firma kodu var. İlgili satırı düzeltin.</p>}
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!supplier || lines.length === 0 || invalidLinks || busy}><Save />{busy ? "Kaydediliyor…" : "Taslağı kaydet"}</Button>
        {actions}
      </div>
    </form>
  );
}
