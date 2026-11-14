import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { validateStockLimits } from "@/lib/stock-limits";
import { Save } from "lucide-react";

type Product = { id: string; sku: string | null; revision: number; min_stock: number; max_stock: number | null };
export function BulkProductDialog({ products, categories, onClose, onSaved }: { products: Product[]; categories: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [fields, setFields] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [category, setCategory] = useState("");
  const [alert, setAlert] = useState("on");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = (field: string) => { setFields(previous => previous.includes(field) ? previous.filter(f => f !== field) : [...previous, field]); setConfirm(false); };
  const patch: { price?: number; min_stock?: number; max_stock?: number | null; category_id?: string | null; stock_alert_enabled?: boolean; [key: string]: Json | undefined } = {};
  if (fields.includes("price")) patch.price = Number(price.replace(",", "."));
  if (fields.includes("min_stock")) patch.min_stock = Number(min);
  if (fields.includes("max_stock")) patch.max_stock = max.trim() ? Number(max) : null;
  if (fields.includes("category_id")) patch.category_id = category || null;
  if (fields.includes("stock_alert_enabled")) patch.stock_alert_enabled = alert === "on";
  const validate = () => {
    if (!fields.length) return "En az bir alan seçin.";
    if (fields.includes("price") && (!price.trim() || !Number.isFinite(Number(patch.price)) || Number(patch.price) < 0)) return "Geçerli bir fiyat girin.";
    if (fields.includes("min_stock") && !min.trim()) return "Minimum stok girin.";
    for (const p of products) {
      const error = validateStockLimits(fields.includes("min_stock") ? Number(patch.min_stock) : p.min_stock, fields.includes("max_stock") ? patch.max_stock === null ? null : Number(patch.max_stock) : p.max_stock);
      if (error) return `KM ${p.sku ?? "—"}: ${error}`;
    }
    return null;
  };
  const save = async () => {
    const error = validate(); if (error) { toast.error(error); return; }
    setBusy(true);
    try {
      const result = await supabase.rpc("admin_bulk_products", { _items: products.map(p => ({ id: p.id, revision: p.revision })), _patch: patch });
      if (result.error) throw new Error(result.error.message);
      toast.success(`${result.data} ürün güncellendi`); onSaved(); onClose();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Kaydedilemedi"); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{products.length} ürünü toplu düzenle</DialogTitle><DialogDescription>KM No: {products.map(p => p.sku ?? "—").join(", ")}</DialogDescription></DialogHeader>
    {confirm ? <div className="space-y-4"><dl className="divide-y text-sm">{fields.map(field => <div key={field} className="flex justify-between gap-4 py-2"><dt>{{ price: "Fiyat (TL)", min_stock: "Minimum stok", max_stock: "Maksimum stok", category_id: "Kullanım yeri", stock_alert_enabled: "Stok uyarısı" }[field]}</dt><dd className="font-semibold">{field === "category_id" ? categories.find(c => c.id === category)?.name ?? "Belirlenmedi" : field === "stock_alert_enabled" ? alert === "on" ? "Açık" : "Kapalı" : patch[field] === null ? "Belirlenmedi" : String(patch[field])}</dd></div>)}</dl><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>Geri</Button><Button disabled={busy} onClick={save}><Save />{busy ? "Kaydediliyor…" : `${products.length} ürüne uygula`}</Button></div></div> : <div className="space-y-4">
      {[{ key: "price", label: "Fiyat (TL)", value: price, set: setPrice, step: "0.01" }, { key: "min_stock", label: "Minimum stok", value: min, set: setMin, step: "1" }, { key: "max_stock", label: "Maksimum stok", value: max, set: setMax, step: "1" }].map(f => <div key={f.key} className="grid grid-cols-[1fr_140px] items-center gap-3"><label className="flex items-center gap-2 text-sm"><Checkbox checked={fields.includes(f.key)} onCheckedChange={() => toggle(f.key)} />{f.label}</label><Input aria-label={`Toplu ${f.label}`} disabled={!fields.includes(f.key)} type="number" min={0} step={f.step} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.key === "max_stock" ? "Belirlenmedi" : ""} /></div>)}
      <div className="space-y-2"><label className="flex items-center gap-2 text-sm"><Checkbox checked={fields.includes("category_id")} onCheckedChange={() => toggle("category_id")} />Kullanım yeri</label><select aria-label="Toplu kullanım yeri" disabled={!fields.includes("category_id")} value={category} onChange={e => setCategory(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm"><option value="">Belirlenmedi</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="space-y-2"><label className="flex items-center gap-2 text-sm"><Checkbox checked={fields.includes("stock_alert_enabled")} onCheckedChange={() => toggle("stock_alert_enabled")} />Stok uyarısı</label><select aria-label="Toplu stok uyarısı" disabled={!fields.includes("stock_alert_enabled")} value={alert} onChange={e => setAlert(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm"><option value="on">Açık</option><option value="off">Kapalı</option></select></div>
      <Button className="w-full" disabled={!fields.length} onClick={() => { const error = validate(); if (error) toast.error(error); else setConfirm(true); }}>Değişiklikleri incele</Button>
    </div>}
  </DialogContent></Dialog>;
}