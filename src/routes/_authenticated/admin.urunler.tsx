import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery, type CatalogProduct } from "@/lib/catalog";
import { money, slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/urunler")({ component: AdminProducts });

type Form = { id?: string; name: string; description: string; price: string; min_stock: string; category_id: string; image_url: string; oems: string; brands: string[]; models: string[] };
const empty: Form = { name: "", description: "", price: "", min_stock: "50", category_id: "", image_url: "", oems: "", brands: [], models: [] };

function AdminProducts() {
  const { data } = useQuery(catalogQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const refresh = () => qc.invalidateQueries();

  const edit = (p: CatalogProduct) => setForm({
    id: p.id, name: p.name, description: p.description ?? "", price: String(p.price), min_stock: String(p.min_stock), category_id: p.category_id ?? "", image_url: p.image_url ?? "",
    oems: p.oems.map((o) => o.oem).join(", "), brands: p.vehicles.filter((v) => !v.model_id).map((v) => v.brand_id), models: p.vehicles.filter((v) => v.model_id).map((v) => v.model_id!),
  });

  const save = async () => {
    if (!form || !data) return;
    const row = { name: form.name, slug: slugify(form.name), description: form.description || null, price: Number(form.price), min_stock: Number(form.min_stock), category_id: form.category_id || null, image_url: form.image_url || null };
    const res = form.id ? await supabase.from("products").update(row).eq("id", form.id).select("id").single() : await supabase.from("products").insert(row).select("id").single();
    if (res.error) { toast.error(res.error.message); return; }
    const id = res.data.id;
    await supabase.from("product_oem_numbers").delete().eq("product_id", id);
    await supabase.from("product_vehicles").delete().eq("product_id", id);
    const oems = form.oems.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).map((oem) => ({ product_id: id, oem }));
    if (oems.length) await supabase.from("product_oem_numbers").insert(oems);
    const veh = [
      ...form.brands.map((b) => ({ product_id: id, brand_id: b, model_id: null })),
      ...form.models.map((m) => ({ product_id: id, brand_id: data.models.find((x) => x.id === m)!.brand_id, model_id: m })),
    ];
    if (veh.length) await supabase.from("product_vehicles").insert(veh);
    toast.success("Kaydedildi"); setForm(null); refresh();
  };
  const del = async (id: string) => { if (!confirm("Ürün silinsin mi?")) return; const { error } = await supabase.from("products").delete().eq("id", id); if (error) toast.error(error.message); else refresh(); };
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold">Ürünler</h2><Button size="sm" onClick={() => setForm(empty)}><Plus className="h-4 w-4" />Yeni ürün</Button></div>
        <table className="w-full rounded-md border bg-card text-sm">
          <thead className="bg-secondary text-left"><tr><th className="p-2">Ürün</th><th className="p-2">OEM</th><th className="p-2 text-right">Fiyat</th><th className="p-2 text-right">Stok</th><th /></tr></thead>
          <tbody>{data?.products.map((p) => (
            <tr key={p.id} className="border-t"><td className="p-2 font-semibold">{p.name}<div className="text-xs font-normal text-muted-foreground">{p.category?.name}</div></td>
              <td className="font-oem p-2 text-xs">{p.oems.map((o) => o.oem).join(", ")}</td><td className="p-2 text-right">{money(p.price)}</td><td className="p-2 text-right">{p.stock}</td>
              <td className="p-2 text-right whitespace-nowrap"><button onClick={() => edit(p)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Düzenle"><Pencil className="h-4 w-4" /></button><button onClick={() => del(p.id)} className="p-1 text-muted-foreground hover:text-destructive" aria-label="Sil"><Trash2 className="h-4 w-4" /></button></td></tr>
          ))}</tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Stok, "Alımlar" sekmesinden alım girildiğinde artar; sipariş onaylandığında düşer.</p>
      </section>
      <aside className="space-y-6"><CatalogLists onChange={refresh} /></aside>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? "Ürünü düzenle" : "Yeni ürün"}</DialogTitle></DialogHeader>
          {form && data && (
            <div className="grid gap-3">
              <div><Label>Ürün adı</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Satış fiyatı (₺)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Kritik stok</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
                <div><Label>Kategori</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">—</option>{data.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              </div>
              <div><Label>OEM numaraları (virgülle ayırın)</Label><Input className="font-oem" value={form.oems} onChange={(e) => setForm({ ...form, oems: e.target.value })} /></div>
              <div><Label>Görsel adresi (isteğe bağlı)</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
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
              <Button onClick={save} disabled={!form.name || !form.price}>Kaydet</Button>
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
