import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { date, money } from "@/lib/format";
import { fetchAll } from "@/lib/fetch-all";
import { compareProductCodes } from "@/lib/catalog-rules";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePurchaseQuantity, isPurchaseQuantity } from "@/lib/purchase-quantity";

export const Route = createFileRoute("/_authenticated/admin/alimlar")({ head: () => ({ meta: [{ title: "Alımlar ve Tedarikçiler — KlipsMarket" }, { name: "description", content: "Ürün alımları ve tedarikçi kayıtları." }, { property: "og:title", content: "Alımlar ve Tedarikçiler — KlipsMarket" }, { property: "og:description", content: "Ürün alımları ve tedarikçi kayıtları." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Purchases });

function Purchases() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ supplier_id: "", purchase_date: today });
  const [entries, setEntries] = useState<Record<string, { quantity: number; cost: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [sup, setSup] = useState({ name: "", phone: "", address: "" });
  const [page, setPage] = useState(0);
  const { data } = useQuery({
    queryKey: ["admin-purchases"],
    queryFn: async () => {
      const [s, p, codes] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        fetchAll((from, to) => supabase.from("products").select("id,name,sku,stock,min_stock,max_stock").order("name").order("id").range(from, to)),
        fetchAll((from,to)=>supabase.from("product_supplier_codes").select("product_id,supplier_id,code").order("id").range(from,to)),
      ]);
      return { codes, suppliers: s.data ?? [], products: p.sort(compareProductCodes) };
    },
  });
  const { data: list } = useQuery({
    queryKey: ["admin-purchases", "list", page, f.supplier_id],
    queryFn: async () => {
      let request = supabase.from("purchases").select("*, supplier:suppliers(name), product:products(name,sku)", { count: "exact" })
        .order("purchase_date", { ascending: false }).order("created_at", { ascending: false }).order("id").range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if(f.supplier_id) request=request.eq("supplier_id",f.supplier_id);
      const r=await request;
      if (r.error) throw new Error(r.error.message);
      return { rows: r.data ?? [], total: r.count ?? 0 };
    },
  });
  const addPurchase = async (productId: string) => {
    const entry = entries[productId] ?? { quantity: 100, cost: "" };
    if (saving || !isPurchaseQuantity(entry.quantity) || entry.cost === "" || !Number.isFinite(Number(entry.cost)) || Number(entry.cost) < 0 || !f.purchase_date) return;
    setSaving(productId);
    try {
      const { error } = await supabase.from("purchases").insert({ supplier_id: f.supplier_id || null, product_id: productId, quantity: entry.quantity, unit_cost: Number(entry.cost), purchase_date: f.purchase_date });
      if (error) throw error;
      toast.success("Alım kaydedildi, stok güncellendi");
      setEntries((old) => { const next = { ...old }; delete next[productId]; return next; });
      await qc.invalidateQueries();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Alım kaydedilemedi."); }
    finally { setSaving(null); }
  };
  const addSupplier = async () => {
    const { error } = await supabase.from("suppliers").insert(sup);
    if (error) { toast.error(error.message); return; }
    setSup({ name: "", phone: "", address: "" }); qc.invalidateQueries();
  };
  const del = async (id: string) => { if (!confirm("Alım silinsin mi? Stoktan düşülecek.")) return; await supabase.from("purchases").delete().eq("id", id); qc.invalidateQueries(); };
  const available=(data?.products ?? []).filter(p=>!f.supplier_id || data?.codes.some(c=>c.product_id===p.id && c.supplier_id===f.supplier_id));
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
      <section className="min-w-0 space-y-6">
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="font-bold">{f.supplier_id ? `${data?.suppliers.find(s=>s.id===f.supplier_id)?.name ?? ""} ürünleri` : "Tüm ürünler"}</h2><div><Label htmlFor="purchase-date">Alım tarihi</Label><Input id="purchase-date" type="date" value={f.purchase_date} disabled={saving !== null} onChange={(e) => setF({ ...f, purchase_date: e.target.value })} /></div></div>
          <div className="max-h-96 overflow-auto border"><table className="w-full bg-card text-sm"><thead className="sticky top-0 bg-secondary text-left"><tr>{["KM No / Ürün", "Tedarikçi stok kodu", "Stok", "Alım"].map(h=><th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{available.map(p=>{
            const entry = entries[p.id] ?? { quantity: 100, cost: "" };
            const name = p.sku ?? p.name;
            const update = (patch: Partial<typeof entry>) => setEntries(old=>({...old,[p.id]:{...entry,...patch}}));
            return <tr key={p.id} className="border-t"><td className="min-w-48 p-2">{p.sku} · {p.name}</td><td className="p-2 font-oem">{data?.codes.filter(c=>c.product_id===p.id && (!f.supplier_id || c.supplier_id===f.supplier_id)).map(c=>c.code).filter(Boolean).join(", ") || "—"}</td><td className="p-2">{p.stock}</td><td className="p-2"><div className="space-y-2"><div className="flex items-center gap-1"><Button size="icon" variant="outline" aria-label={`${name} 100 azalt`} title="100 azalt" disabled={entry.quantity===100 || saving!==null} onClick={()=>update({quantity:changePurchaseQuantity(entry.quantity,-1)})}><Minus /></Button><Input className="w-24 text-center" aria-label={`${name} alım adedi`} type="number" min={100} step={100} value={entry.quantity} disabled={saving!==null} onChange={e=>{const quantity=Number(e.target.value);if(isPurchaseQuantity(quantity))update({quantity});}}/><Button size="icon" variant="outline" aria-label={`${name} 100 artır`} title="100 artır" disabled={saving!==null} onClick={()=>update({quantity:changePurchaseQuantity(entry.quantity,1)})}><Plus /></Button></div><div className="flex items-center gap-2"><Input placeholder="Alış fiyatı ₺" className="w-28" aria-label={`${name} alış fiyatı`} type="number" min={0} step="0.01" value={entry.cost} disabled={saving!==null} onChange={e=>update({cost:e.target.value})}/><Button size="sm" aria-label={`${name} alım ekle`} onClick={()=>void addPurchase(p.id)} disabled={saving!==null || entry.cost==="" || Number(entry.cost)<0 || !f.purchase_date}>{saving===p.id ? "Kaydediliyor…" : "Alım ekle"}</Button></div></div></td></tr>;
          })}</tbody></table>{available.length===0 && <p className="p-4">Bu tedarikçiye bağlı ürün yok.</p>}</div>
        </section>
        <div className="overflow-x-auto"><table className="w-full rounded-md border bg-card text-sm">
          <thead className="bg-secondary text-left"><tr><th className="p-2">Tarih</th><th className="p-2">Ürün</th><th className="p-2">Tedarikçi</th><th className="p-2 text-right">Adet</th><th className="p-2 text-right">Alış fiyatı</th><th className="p-2 text-right">Toplam</th><th /></tr></thead>
          <tbody>
            {list?.rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Henüz alım yok</td></tr>}
            {list?.rows.map((p) => <tr key={p.id} className="border-t"><td className="p-2">{date(p.purchase_date)}</td><td className="p-2">{p.product?.sku && <span className="font-oem mr-1 text-xs text-muted-foreground">{p.product.sku}</span>}{p.product?.name}</td><td className="p-2">{p.supplier?.name ?? "—"}</td><td className="p-2 text-right">{p.quantity}</td><td className="p-2 text-right">{money(p.unit_cost)}</td><td className="p-2 text-right font-semibold">{money(p.quantity * Number(p.unit_cost))}</td>
              <td className="p-2"><button onClick={() => del(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Sil"><Trash2 className="h-4 w-4" /></button></td></tr>)}
          </tbody>
        </table></div>
        {list && <Pager page={page} total={list.total} onChange={setPage} />}
      </section>
      <aside className="space-y-3 rounded-md border bg-card p-4">
        <h3 className="font-extrabold">Tedarikçi firmalar</h3><Button variant="outline" size="sm" disabled={saving!==null} onClick={()=>{setF({...f,supplier_id:""});setEntries({});setPage(0);}}>Tüm tedarikçiler</Button>
        <ul className="space-y-1 text-sm">{data?.suppliers.map((s) => <li key={s.id}><Button size="sm" disabled={saving!==null} variant={f.supplier_id===s.id?"secondary":"ghost"} onClick={()=>{setF({...f,supplier_id:s.id});setEntries({});setPage(0);}}>{s.name}</Button> <span className="text-muted-foreground">{s.phone}</span></li>)}</ul>
        <Input placeholder="Firma adı" value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} />
        <Input placeholder="Telefon" value={sup.phone} onChange={(e) => setSup({ ...sup, phone: e.target.value })} />
        <Input placeholder="Adres" value={sup.address} onChange={(e) => setSup({ ...sup, address: e.target.value })} />
        <Button className="w-full" onClick={addSupplier} disabled={!sup.name}>Tedarikçi ekle</Button>
      </aside>
    </div>
  );
}
