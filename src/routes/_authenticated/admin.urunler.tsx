import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, matchesSearch, type CatalogProduct } from "@/lib/catalog";
import { fetchAll } from "@/lib/fetch-all";
import { supplierCodeRows } from "@/lib/catalog-rules";
import { validateStockLimits } from "@/lib/stock-limits";
import { parsePackageQuantity } from "@/lib/package-quantity";
import { money, slugify } from "@/lib/format";
import { ProductPhotoUpload } from "@/components/site/ProductPhotoUpload";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkProductDialog } from "@/components/site/BulkProductDialog";
import { toggleSelection } from "@/lib/admin-rules";

export const Route = createFileRoute("/_authenticated/admin/urunler")({ head: () => ({ meta: [{ title: "Ürün Yönetimi — KlipsMarket" }, { name: "description", content: "Klips kataloğu ve yöneticiye özel tedarikçi bilgileri." }, { property: "og:title", content: "Ürün Yönetimi — KlipsMarket" }, { property: "og:description", content: "Klips kataloğu ve yöneticiye özel tedarikçi bilgileri." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: AdminProducts });

type SupRow = { on: boolean; code: string };
type Form = { id?: string; sku: string; name: string; description: string; price: string; package_quantity: string; min_stock: string; max_stock: string; stock: number; origStock?: number; revision?: number; category_id: string; image_url: string; image_original_url?: string; image_thumbnail_url?: string; oems: string; brands: string[]; models: string[]; sups: Record<string, SupRow> };
const empty: Form = { sku: "", name: "", description: "", price: "", package_quantity: "", min_stock: "50", max_stock: "", stock: 0, category_id: "", image_url: "", oems: "", brands: [], models: [], sups: {} };

// Admin-only: which suppliers sell each product and under which code. RLS lets only admins read this.
const supplierCodesQuery = queryOptions({
  queryKey: ["admin-supplier-codes"],
  queryFn: async () => {
    const [codes, sups] = await Promise.all([
      fetchAll((from, to) => supabase.from("product_supplier_codes").select("id, product_id, supplier_id, code").order("id").range(from, to)),
      supabase.from("suppliers").select("id, name").order("name"),
    ]);
    const byProduct = new Map<string, { supplier_id: string; code: string | null }[]>();
    codes.forEach((c) => byProduct.set(c.product_id, [...(byProduct.get(c.product_id) ?? []), c]));
    return { byProduct, suppliers: sups.data ?? [] };
  },
});

function AdminProducts() {
  const { data } = useQuery(catalogQuery);
  const { data: sc } = useQuery(supplierCodesQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [q, setQ] = useState("");
  const [review, setReview] = useState(false);
  const [page, setPage] = useState(0);
  const [missing,setMissing] = useState("all");
  const [quick,setQuick] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulk, setBulk] = useState(false);
  const [saving, setSaving] = useState(false);
  const refresh = () => qc.invalidateQueries();
  const supName = (id: string) => sc?.suppliers.find((x) => x.id === id)?.name ?? "—";

  const edit = (p: CatalogProduct) => setForm({
    id: p.id, sku: p.sku ?? "", name: p.name, description: p.description ?? "", price: String(p.price), min_stock: String(p.min_stock), max_stock: p.max_stock === null ? "" : String(p.max_stock), stock: p.stock, origStock: p.stock, revision: Number(p.revision ?? 0), category_id: p.category_id ?? "", image_url: p.image_url ?? "", image_original_url:p.image_original_url ?? "",image_thumbnail_url:p.image_thumbnail_url ?? "",
    oems: p.oems.map((o) => o.oem).join(", "), brands: p.vehicles.filter((v) => !v.model_id).map((v) => v.brand_id), models: p.vehicles.flatMap((v) => v.model_id ? [v.model_id] : []),
    package_quantity: p.package_quantity === null ? "" : String(p.package_quantity),
    sups: (sc?.byProduct.get(p.id) ?? []).reduce<Record<string, SupRow>>((acc, c) => {
      const previous = acc[c.supplier_id]?.code;
      acc[c.supplier_id] = { on: true, code: [previous, c.code].filter(Boolean).join("\n") };
      return acc;
    }, {}),
  });

  const save = async () => {
    if (!form || !data) return;
    const maxStock = form.max_stock.trim() === "" ? null : Number(form.max_stock);
    const limitsError = validateStockLimits(Number(form.min_stock), maxStock);
    if (limitsError) { toast.error(limitsError); return; }
    if (!Number.isInteger(form.stock) || form.stock < 0) { toast.error("Stok sıfır veya pozitif tam sayı olmalı"); return; }
    let packageQuantity: number | null;
    try { packageQuantity = parsePackageQuantity(form.package_quantity); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Geçersiz paket adedi"); return; }
    const row = { sku: form.sku.trim() || null, name: form.name, slug: slugify(`${form.name} km ${form.sku || Date.now()}`), description: form.description || null, price: Number(form.price || 0), package_quantity: packageQuantity, min_stock: Number(form.min_stock), max_stock: maxStock, category_id: form.category_id || null, image_url: form.image_url || null, image_original_url:form.image_original_url || null,image_thumbnail_url:form.image_thumbnail_url || null, needs_review: !form.category_id };
    const oemList = [...new Set(form.oems.split(/[,\n]/).map((s) => s.trim()).filter(Boolean))];
    const veh = [
      ...form.brands.map((b) => ({ brand_id: b, model_id: null as string | null })),
      ...form.models.flatMap((m) => {
        const model = data.models.find((x) => x.id === m);
        return model ? [{ brand_id: model.brand_id, model_id: m }] : [];
      }),
    ];
    const codes = supplierCodeRows(form.sups);
    const skuMsg = (m: string) => m.includes("sku") ? "Bu KlipsMarket No başka bir üründe kullanılıyor" : m.includes("STALE_PRODUCT") ? "Ürün siz düzenlerken değişti (ör. sipariş onaylandı). Hiçbir değişiklik kaydedilmedi; pencereyi kapatıp tekrar açın." : m;
    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase.rpc("admin_save_product", { _id: form.id, _expected_revision: form.revision ?? 0, _product: row, _stock: form.stock, _oems: oemList, _vehicles: veh, _codes: codes });
        if (error) { toast.error(skuMsg(error.message)); if (error.message.includes("STALE_PRODUCT")) refresh(); return; }
      } else {
        const { error } = await supabase.rpc("create_admin_product", { _product: row, _oems: oemList, _vehicles: veh, _supplier_codes: codes, _initial_stock: form.stock });
        if (error) { toast.error(skuMsg(error.message)); return; }
      }
    } finally { setSaving(false); }
    toast.success("Kaydedildi"); setForm(null); refresh();
  };
  const del = async (id: string) => { if (!confirm("Ürün silinsin mi?")) return; const { error } = await supabase.from("products").delete().eq("id", id); if (error) toast.error(error.message); else refresh(); };
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const supText = (pid: string) => (sc?.byProduct.get(pid) ?? []).map((c) => `${supName(c.supplier_id)}${c.code ? ` ${c.code}` : ""}`);
  const list = (data?.products ?? []).filter((p) => {
    if (review && !p.needs_review) return false;
    if(missing === "category" && p.category_id) return false;
    if(missing === "vehicles" && p.vehicles.length) return false;
    if(missing === "photos" && p.image_url) return false;
    if (!q) return true;
    if (matchesSearch(p, q)) return true;
    const n = q.toLocaleLowerCase("tr").replace(/\s/g, "");
    return supText(p.id).some((t) => t.toLocaleLowerCase("tr").replace(/\s/g, "").includes(n));
  });
  const reviewCount = data?.products.filter((p) => p.needs_review).length ?? 0;
  const visible = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const chosen = visible.filter(p => selected.includes(p.id));

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_240px]">
      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-extrabold">Ürünler <span className="text-sm font-normal text-muted-foreground">({list.length})</span></h2><Button size="sm" asChild><Link to="/admin/urun-ekle"><Plus className="h-4 w-4" />Yeni ürün</Link></Button></div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="KM No, ürün adı, OEM veya firma kodu" className="max-w-sm" />
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={quick} onChange={(e) => setQuick(e.target.checked)} />Hızlı fiyat/stok/min-max düzenleme</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={review} onChange={(e) => { setReview(e.target.checked); setPage(0); }} />Sadece kontrol edilecekler ({reviewCount})</label>
        </div>
        <select aria-label="Eksik bilgi filtresi" className="mb-3 rounded-md border bg-background p-2 text-sm" value={missing} onChange={e=>{setMissing(e.target.value);setPage(0);}}><option value="all">Tüm bilgiler</option><option value="category">Kategorisi eksik</option><option value="vehicles">Araç uyumu eksik</option><option value="photos">Fotoğrafı eksik</option></select>
        <div className="mb-3 flex flex-wrap items-center gap-2"><Checkbox aria-label="Bu sayfadaki ürünleri seç" checked={visible.length > 0 && visible.every(p => selected.includes(p.id))} onCheckedChange={checked => setSelected(checked ? visible.map(p => p.id) : [])} /><span className="mr-auto text-sm text-muted-foreground">{chosen.length} ürün seçildi</span><Button size="sm" variant="outline" disabled={!chosen.length} onClick={() => setBulk(true)}><Pencil />Toplu düzenle</Button>{chosen.length > 0 && <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Seçimi temizle</Button>}</div>
        <div className="overflow-x-auto rounded-md border">
        <table className="w-full bg-card text-sm">
          <thead className="bg-secondary text-left"><tr><th className="p-2">Seç</th><th className="p-2">KM No</th><th className="p-2">Ürün</th><th className="p-2">OEM</th><th className="p-2">Alındığı firmalar / kod</th><th className="p-2 text-right">Fiyat</th><th className="p-2 text-right">Stok</th><th className="p-2 text-right">Min / Max</th><th /></tr></thead>
          <tbody>{visible.map((p) => (
            <tr key={p.id} className="border-t align-top hover:bg-secondary/40"><td className="p-2"><Checkbox aria-label={`KM ${p.sku ?? "—"} seç`} checked={selected.includes(p.id)} onCheckedChange={() => setSelected(ids => toggleSelection(ids,p.id))} /></td><td className="font-oem p-2 text-xs font-semibold">{p.sku ?? "—"}</td>
              <td className="p-2 font-semibold">{p.name}<div className="text-xs font-normal text-muted-foreground">{p.category?.name ?? <span className="text-warning">Kontrol edilecek: ürün grubu yok</span>}</div></td>
              
              <td className="font-oem p-2 text-xs">{p.oems.map((o) => o.oem).join(", ")}</td>
              <td className="p-2 text-xs">{supText(p.id).map((t) => <div key={t} className="font-oem whitespace-nowrap">{t}</div>)}</td>
              <td className="p-2 text-right whitespace-nowrap">{quick ? <QuickNum label="Fiyat" value={Number(p.price)} step="0.01" onSave={async v=>{const {error}=await supabase.from("products").update({price:v}).eq("id",p.id); if(error) toast.error(error.message); else {toast.success("Fiyat güncellendi"); refresh();}}}/> : Number(p.price) > 0 ? money(p.price) : <span className="text-muted-foreground">—</span>}</td><td className="p-2 text-right">{quick ? <QuickNum label="Stok" value={p.stock} step="1" onSave={async v=>{const {error}=await supabase.from("stock_adjustments").insert({product_id:p.id,new_stock:Math.round(v),reason:"Hızlı stok düzeltme"}); if(error) toast.error(error.message); else {toast.success("Stok güncellendi"); refresh();}}}/> : p.stock}</td>
              <td className="p-2 text-right whitespace-nowrap">{quick ? <QuickLimits key={`${p.id}-${p.min_stock}-${p.max_stock}`} min={p.min_stock} max={p.max_stock} onSave={async (min,max)=>{const {error}=await supabase.from("products").update({min_stock:min,max_stock:max}).eq("id",p.id); if(error) toast.error(error.message); else {toast.success("Stok seviyeleri kaydedildi"); refresh();}}}/> : <>{p.min_stock} / {p.max_stock ?? "—"}</>}</td>
              <td className="p-2 text-right whitespace-nowrap"><Button variant="ghost" size="icon" onClick={() => edit(p)} aria-label="Düzenle"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => del(p.id)} aria-label="Sil"><Trash2 className="h-4 w-4" /></Button></td></tr>
          ))}</tbody>
        </table>
        </div>
        <Pager page={page} total={list.length} onChange={value => { setSelected([]); setPage(value); }} />
        <p className="mt-2 text-xs text-muted-foreground">Alındığı firmalar ve kodları yalnızca yönetim panelinde görünür, müşteriler göremez. Stok, "Alımlar" sekmesinden alım girildiğinde artar, sipariş onaylandığında düşer; toplu sayım için "Toplu Stok Aktarımı" sekmesini kullanın.</p>
      </section>
      <aside className="space-y-6"><CatalogLists onChange={refresh} /></aside>
      {bulk && data && <BulkProductDialog products={chosen} categories={data.categories} onClose={() => setBulk(false)} onSaved={() => { setSelected([]); refresh(); }} />}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Ürünü düzenle" : "Yeni ürün"}</DialogTitle></DialogHeader>
          {form && data && (
            <div className="grid gap-3">
              <div className="grid grid-cols-[140px_1fr] gap-3">
                <div><Label>KlipsMarket No</Label><Input className="font-oem" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                <div><Label>Ürün adı (stok açıklaması)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Satış fiyatı (₺)</Label><Input type="number" step="0.01" placeholder="Boş = fiyat yakında" value={form.price === "0" ? "" : form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Kategori</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">—</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label htmlFor="product-stock">Mevcut stok</Label><Input id="product-stock" type="number" min={0} step={1} disabled={!form.id} title={form.id ? "" : "Yeni ürünün açılış stoğu Yeni ürün sayfasından girilir"} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
                <div><Label htmlFor="product-min-stock">Min stok</Label><Input id="product-min-stock" type="number" min={0} step={1} value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
                <div><Label htmlFor="product-max-stock">Max stok</Label><Input id="product-max-stock" type="number" min={Number(form.min_stock) || 0} step={1} placeholder="Belirlenmedi" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: e.target.value })} /></div>
              </div>
              <div><Label>OEM numaraları (virgülle ayırın)</Label><Input className="font-oem" value={form.oems} onChange={(e) => setForm({ ...form, oems: e.target.value })} /></div>
              <div><Label htmlFor="product-package-quantity">Paket içi adet</Label><Input id="product-package-quantity" type="number" min={1} step={1} placeholder="Belirlenmedi" value={form.package_quantity} onChange={(e) => setForm({ ...form, package_quantity: e.target.value })} /></div>
              <div>
                <Label>Alındığı firmalar ve ürün kodları (yalnızca admin görür)</Label>
                <div className="mt-1 grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                  {sc?.suppliers.map((sp) => {
                    const v = form.sups[sp.id] ?? { on: false, code: "" };
                    const setV = (nv: SupRow) => setForm({ ...form, sups: { ...form.sups, [sp.id]: nv } });
                    return (
                      <div key={sp.id} className="flex items-start gap-2">
                        <label className="flex w-32 shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={v.on} onChange={(e) => setV({ ...v, on: e.target.checked })} />{sp.name}</label>
                        <Textarea aria-label={`${sp.name} ürün kodları`} className="font-oem min-h-16" placeholder="Ürün kodları (virgül veya yeni satır)" value={v.code} onChange={(e) => setV({ on: true, code: e.target.value })} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div><Label>Ürün fotoğrafı</Label><ProductPhotoUpload onChange={photos=>setForm({...form,...photos})}/><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value,image_original_url:"",image_thumbnail_url:"" })} /></div>
              <div><Label>Açıklama</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>Uyumlu araçlar</Label>
                <div className="mt-1 grid max-h-64 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
                  {data.brands.map((b) => (
                    <div key={b.id}>
                      <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.brands.includes(b.id)} onChange={() => setForm({ ...form, brands: toggle(form.brands, b.id) })} />{b.name} (tüm modeller)</label>
                      <div className="ml-5">{data.models.filter((m) => m.brand_id === b.id).map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.models.includes(m.id)} onChange={() => setForm({ ...form, models: toggle(form.models, m.id) })} />{m.name}</label>
                      ))}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={save} disabled={!form.name}>Kaydet</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CatalogLists({ onChange }: { onChange: () => void }) {
  const { data } = useQuery(catalogQuery);
  const [cat, setCat] = useState(""); const [brand, setBrand] = useState(""); const [model, setModel] = useState(""); const [mb, setMb] = useState("");
  const run = async (p: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await p; if (error) toast.error(error.message); else onChange(); };
  return (
    <>
      <div className="rounded-md border bg-card p-4">
        <h3 className="mb-2 font-extrabold">Kullanım yerleri</h3>
        <ul className="mb-2 space-y-1 text-sm">{data?.categories.map((c) => <li key={c.id} className="flex justify-between">{c.name}<button onClick={() => run(supabase.from("categories").delete().eq("id", c.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button></li>)}</ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (cat) run(supabase.from("categories").insert({ name: cat, slug: slugify(cat) })); setCat(""); }}><Input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Yeni" /><Button size="sm">Ekle</Button></form>
      </div>
      <div className="rounded-md border bg-card p-4">
        <h3 className="mb-2 font-extrabold">Markalar</h3>
        <ul className="mb-2 space-y-1 text-sm">{data?.brands.map((b) => <li key={b.id} className="flex justify-between">{b.name}<button onClick={() => run(supabase.from("brands").delete().eq("id", b.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button></li>)}</ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (brand) run(supabase.from("brands").insert({ name: brand, slug: slugify(brand) })); setBrand(""); }}><Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Yeni marka" /><Button size="sm">Ekle</Button></form>
        <h3 className="mb-2 mt-4 font-extrabold">Model ekle</h3>
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (model && mb) run(supabase.from("vehicle_models").insert({ name: model, brand_id: mb })); setModel(""); }}>
          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={mb} onChange={(e) => setMb(e.target.value)}><option value="">Marka seçin</option>{data?.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <div className="flex gap-2"><Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model adı" /><Button size="sm">Ekle</Button></div>
        </form>
      </div>
    </>
  );
}

function QuickNum({ label, value, step, onSave }: { label: string; value: number; step: string; onSave: (v: number) => Promise<void> }) {
  const [v, setV] = useState(String(value));
  const commit = () => { const n = Number(v.replace(",", ".")); if (!Number.isFinite(n) || n < 0) { setV(String(value)); toast.error(`${label} geçersiz`); return; } if (n !== value) void onSave(n); };
  return <Input aria-label={label} type="number" min={0} step={step} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} className="ml-auto h-8 w-24 text-right" />;
}

function QuickLimits({ min, max, onSave }: { min: number; max: number | null; onSave: (min: number, max: number | null) => Promise<void> }) {
  const [a, setA] = useState(String(min)); const [b, setB] = useState(max === null ? "" : String(max));
  const nMin = Number(a); const nMax = b.trim() === "" ? null : Number(b);
  const err = validateStockLimits(nMin, nMax);
  const dirty = nMin !== min || nMax !== max;
  return <div className="flex items-center justify-end gap-1">
    <Input aria-label="Min stok" type="number" min={0} step={1} value={a} onChange={(e) => setA(e.target.value)} className="h-8 w-20 text-right" />
    <span>/</span>
    <Input aria-label="Max stok" type="number" min={0} step={1} placeholder="—" value={b} onChange={(e) => setB(e.target.value)} className="h-8 w-20 text-right" />
    <Button size="sm" variant="outline" disabled={!dirty} title={err ?? ""} onClick={() => { if (err) { toast.error(err); return; } void onSave(nMin, nMax); }}>Kaydet</Button>
  </div>;
}
