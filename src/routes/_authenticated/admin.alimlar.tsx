import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { date, money } from "@/lib/format";
import { fetchAll } from "@/lib/fetch-all";
import { compareProductCodes } from "@/lib/catalog-rules";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/alimlar")({ head: () => ({ meta: [{ title: "Alımlar ve Tedarikçiler — KlipsMarket" }, { name: "description", content: "Ürün alımları ve tedarikçi kayıtları." }, { property: "og:title", content: "Alımlar ve Tedarikçiler — KlipsMarket" }, { property: "og:description", content: "Ürün alımları ve tedarikçi kayıtları." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Purchases });

function Purchases() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ supplier_id: "", product_id: "", quantity: "", unit_cost: "", purchase_date: today });
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
  const addPurchase = async () => {
    const { error } = await supabase.from("purchases").insert({ supplier_id: f.supplier_id || null, product_id: f.product_id, quantity: Number(f.quantity), unit_cost: Number(f.unit_cost), purchase_date: f.purchase_date });
    if (error) { toast.error(error.message); return; }
    toast.success("Alım kaydedildi, stok güncellendi"); setF({ ...f, quantity: "", unit_cost: "" }); qc.invalidateQueries();
  };
  const addSupplier = async () => {
    const { error } = await supabase.from("suppliers").insert(sup);
    if (error) { toast.error(error.message); return; }
    setSup({ name: "", phone: "", address: "" }); qc.invalidateQueries();
  };
  const del = async (id: string) => { if (!confirm("Alım silinsin mi? Stoktan düşülecek.")) return; await supabase.from("purchases").delete().eq("id", id); qc.invalidateQueries(); };
  const available=(data?.products ?? []).filter(p=>!f.supplier_id || data?.codes.some(c=>c.product_id===p.id && c.supplier_id===f.supplier_id));
  const sel = "h-9 w-full rounded-md border bg-background px-2 text-sm";
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="min-w-0 space-y-6">
        {f.supplier_id && <section><h2 className="mb-3 font-bold">{data?.suppliers.find(s=>s.id===f.supplier_id)?.name} ürünleri</h2><div className="max-h-80 overflow-auto border"><table className="w-full text-sm"><thead className="bg-secondary text-left"><tr><th className="p-2">KM No / Ürün</th><th className="p-2">Tedarikçi stok kodu</th><th className="p-2">Stok</th><th className="p-2">Alım</th></tr></thead><tbody>{available.map(p=><tr key={p.id} className="border-t"><td className="p-2">{p.sku} · {p.name}</td><td className="p-2 font-oem">{data?.codes.filter(c=>c.product_id===p.id && c.supplier_id===f.supplier_id).map(c=>c.code).filter(Boolean).join(", ") || "—"}</td><td className="p-2">{p.stock}</td><td className="p-2"><Button variant="outline" size="sm" onClick={()=>setF({...f,product_id:p.id})}>Seç</Button></td></tr>)}</tbody></table>{available.length===0 && <p className="p-4">Bu tedarikçiye bağlı ürün yok.</p>}</div></section>}

        <div className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-5 sm:items-end">
          <div className="sm:col-span-2"><Label>Ürün</Label><select className={sel} value={f.product_id} onChange={(e) => setF({ ...f, product_id: e.target.value })}><option value="">Seçin</option>{available.map((p) => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} — ` : ""}{p.name}</option>)}</select></div>
          <div><Label>Tedarikçi</Label><select className={sel} value={f.supplier_id} onChange={(e) => {setF({ ...f, supplier_id: e.target.value,product_id:"" });setPage(0);}}><option value="">—</option>{data?.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><Label>Adet</Label><Input type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
          <div><Label>Alış fiyatı (₺)</Label><Input type="number" step="0.01" value={f.unit_cost} onChange={(e) => setF({ ...f, unit_cost: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Alım tarihi</Label><Input type="date" value={f.purchase_date} onChange={(e) => setF({ ...f, purchase_date: e.target.value })} /></div>
          <Button className="sm:col-span-3" onClick={addPurchase} disabled={!f.product_id || !(Number(f.quantity) > 0) || f.unit_cost === ""}>Alım ekle</Button>
        </div>
        <table className="w-full rounded-md border bg-card text-sm">
          <thead className="bg-secondary text-left"><tr><th className="p-2">Tarih</th><th className="p-2">Ürün</th><th className="p-2">Tedarikçi</th><th className="p-2 text-right">Adet</th><th className="p-2 text-right">Alış fiyatı</th><th className="p-2 text-right">Toplam</th><th /></tr></thead>
          <tbody>
            {list?.rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Henüz alım yok</td></tr>}
            {list?.rows.map((p) => <tr key={p.id} className="border-t"><td className="p-2">{date(p.purchase_date)}</td><td className="p-2">{p.product?.sku && <span className="font-oem mr-1 text-xs text-muted-foreground">{p.product.sku}</span>}{p.product?.name}</td><td className="p-2">{p.supplier?.name ?? "—"}</td><td className="p-2 text-right">{p.quantity}</td><td className="p-2 text-right">{money(p.unit_cost)}</td><td className="p-2 text-right font-semibold">{money(p.quantity * Number(p.unit_cost))}</td>
              <td className="p-2"><button onClick={() => del(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Sil"><Trash2 className="h-4 w-4" /></button></td></tr>)}
          </tbody>
        </table>
        {list && <Pager page={page} total={list.total} onChange={setPage} />}
      </section>
      <aside className="space-y-3 rounded-md border bg-card p-4">
        <h3 className="font-extrabold">Tedarikçi firmalar</h3><Button variant="outline" size="sm" onClick={()=>{setF({...f,supplier_id:"",product_id:""});setPage(0);}}>Tüm tedarikçiler</Button>
        <ul className="space-y-1 text-sm">{data?.suppliers.map((s) => <li key={s.id}><Button size="sm" variant={f.supplier_id===s.id?"secondary":"ghost"} onClick={()=>{setF({...f,supplier_id:s.id,product_id:""});setPage(0);}}>{s.name}</Button> <span className="text-muted-foreground">{s.phone}</span></li>)}</ul>
        <Input placeholder="Firma adı" value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} />
        <Input placeholder="Telefon" value={sup.phone} onChange={(e) => setSup({ ...sup, phone: e.target.value })} />
        <Input placeholder="Adres" value={sup.address} onChange={(e) => setSup({ ...sup, address: e.target.value })} />
        <Button className="w-full" onClick={addSupplier} disabled={!sup.name}>Tedarikçi ekle</Button>
      </aside>
    </div>
  );
}
