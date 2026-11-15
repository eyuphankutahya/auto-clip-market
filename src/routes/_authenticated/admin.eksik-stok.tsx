import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, ListPlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { compareProductCodes } from "@/lib/catalog-rules";
import { isStockShortage, replenishmentQuantity } from "@/lib/stock-shortages";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShortagePurchaseList } from "@/components/site/ShortagePurchaseList";
import { groupPurchaseLines, mergePurchaseLines, purchaseLine, type PurchaseLine } from "@/lib/purchase-list";

const shortageQuery = queryOptions({
  queryKey: ["admin-stock-shortages"],
  queryFn: async () => {
    const [products, links, suppliers] = await Promise.all([
      fetchAll((from, to) => supabase.from("products").select("id,sku,name,stock,min_stock,max_stock").order("id").range(from, to)),
      fetchAll((from, to) => supabase.from("product_supplier_codes").select("product_id,supplier_id,code").order("id").range(from, to)),
      fetchAll((from, to) => supabase.from("suppliers").select("id,name").order("name").order("id").range(from, to)),
    ]);
    const names = new Map(suppliers.map((s) => [s.id, s.name]));
    const byProduct = new Map<string, { supplier_id: string; name: string; code: string | null }[]>();
    for (const link of links) {
      const rows = byProduct.get(link.product_id) ?? [];
      rows.push({ supplier_id: link.supplier_id, name: names.get(link.supplier_id) ?? "—", code: link.code });
      byProduct.set(link.product_id, rows);
    }
    return { products: products.filter(isStockShortage).sort(compareProductCodes).map((p) => ({ ...p, suppliers: byProduct.get(p.id) ?? [] })), suppliers };
  },
});

export const Route = createFileRoute("/_authenticated/admin/eksik-stok")({
  head: () => ({ meta: [
    { title: "Eksik Stok Listesi — KlipsMarket" },
    { name: "description", content: "Stoğu tükenen ve minimumun altındaki ürünlerin tedarik listesini çıkarın." },
    { property: "og:title", content: "Eksik Stok Listesi — KlipsMarket" },
    { property: "og:description", content: "Eksik stokları ve tedarikçi kodlarını listeleyin." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(shortageQuery),
  component: Shortages,
});

function Shortages() {
  const { data, refetch, isFetching } = useSuspenseQuery(shortageQuery);
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [quantities,setQuantities]=useState<Record<string,number>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([]);
  const [purchaseExporting, setPurchaseExporting] = useState(false);
  const supplierFor = (p: typeof data.products[number]) => assigned[p.id] ?? (supplier && p.suppliers.some((s) => s.supplier_id === supplier) ? supplier : new Set(p.suppliers.map((s) => s.supplier_id)).size === 1 ? p.suppliers[0]?.supplier_id ?? "" : "");
  const list = useMemo(() => data.products.filter((p) => {
    if (status === "empty" && p.stock !== 0) return false;
    if (status === "low" && p.stock === 0) return false;
    if (supplier && !p.suppliers.some((s) => s.supplier_id === supplier)) return false;
    const term = query.trim().toLocaleLowerCase("tr");
    return !term || `${p.sku ?? ""} ${p.name} ${p.suppliers.map((s) => s.code ?? "").join(" ")}`.toLocaleLowerCase("tr").includes(term);
  }), [data, query, supplier, status]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1));
  const visible = list.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.includes(p.id));

  function addSelected() {
    try {
      const added = data.products.filter((p) => selected.includes(p.id)).map((p) => purchaseLine(p, supplierFor(p), quantities[p.id] ?? replenishmentQuantity(p)));
      setPurchaseLines((old) => mergePurchaseLines(old, added));
      setSelected([]);
      toast.success(`${added.length} ürün alım listesine eklendi.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Ürünler listeye eklenemedi."); }
  }

  async function downloadPurchaseList() {
    setPurchaseExporting(true);
    try {
      const XLSX = await import("xlsx");
      const book = XLSX.utils.book_new();
      const rows = groupPurchaseLines([...purchaseLines].sort(compareProductCodes)).flatMap((g) => g.lines.map((l) => ({ "Tedarikçi": l.supplierName, "KM No": l.sku ?? "", "Stok Açıklaması": l.name, "Firma kodları": l.codes.join(" · "), "Alım Adedi": l.quantity })));
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 60 }, { wch: 30 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(book, sheet, "Alım Listesi");
      XLSX.writeFile(book, `klipsmarket-alim-listesi-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch { toast.error("Alım listesi indirilemedi. Lütfen tekrar deneyin."); }
    finally { setPurchaseExporting(false); }
  }

  async function download() {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const rows = list.map((p) => ({
        "KM No": p.sku ?? "", "Stok Açıklaması": p.name,
        "Durum": p.stock === 0 ? "Tükendi" : "Minimum altı",
        "Mevcut Stok": p.stock, "Min Stok": p.min_stock, "Max Stok": p.max_stock ?? "",
        "Alım Adedi": quantities[p.id] ?? replenishmentQuantity(p),
        "Tedarikçi ve Kodları": p.suppliers.filter(s=>!supplier || s.supplier_id===supplier).map((s) => `${s.name}${s.code ? `: ${s.code}` : ""}`).join("\n"),
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = [{ wch: 12 }, { wch: 60 }, { wch: 18 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 23 }, { wch: 60 }];
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Eksik Stok");
      XLSX.writeFile(book, `klipsmarket-eksik-stok-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      toast.error("Liste indirilemedi. Lütfen tekrar deneyin.");
    } finally { setExporting(false); }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Eksik stok listesi</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { void refetch().catch(() => toast.error("Stok bilgileri yenilenemedi.")); }} disabled={isFetching} title="Stokları yenile" aria-label="Stokları yenile"><RefreshCw className={isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button>
          <Button variant="outline" onClick={download} disabled={!list.length || exporting || isFetching}><Download />{exporting ? "Hazırlanıyor…" : "Eksik stokları indir"}</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-y py-4 text-sm">
        <span><b>{data.products.filter((p) => p.stock === 0).length}</b> tükenen ürün</span>
        <span><b>{data.products.filter((p) => p.stock > 0).length}</b> minimum altı ürün</span>
        <span><b>{list.length}</b> listelenen ürün</span>
      </div>
      <div className="flex flex-wrap gap-2"><Button variant={!supplier?"secondary":"outline"} size="sm" onClick={()=>{setSupplier("");setPage(0);}}>Tüm tedarikçiler</Button>{data.suppliers.map(s=><Button key={s.id} variant={supplier===s.id?"secondary":"outline"} size="sm" onClick={()=>{setSupplier(s.id);setPage(0);}}>{s.name}</Button>)}</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="shortage-search">KM No / ürün / tedarikçi kodu</Label><Input id="shortage-search" value={query} maxLength={200} onChange={(e) => { setQuery(e.target.value); setPage(0); }} /></div>
        <div className="space-y-2"><Label htmlFor="shortage-status">Stok durumu</Label><select id="shortage-status" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}><option value="all">Tüm eksikler</option><option value="empty">Tükenenler</option><option value="low">Minimum altındakiler</option></select></div>
        <div className="space-y-2"><Label htmlFor="shortage-supplier">Tedarikçi</Label><select id="shortage-supplier" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={supplier} onChange={(e) => { setSupplier(e.target.value); setPage(0); }}><option value="">Tüm tedarikçiler</option>{data.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      </div>
      <p className="text-sm text-muted-foreground">Alım hedefi: maksimum stok; maksimum belirlenmemişse minimum stok. Stok sınırı 0 olan tükenmiş ürünlerde alım adedi belirlenmemiştir.</p>
      <Pager page={currentPage} total={list.length} onChange={setPage} />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={addSelected} disabled={!selected.length || isFetching}><ListPlus />Seçilenleri listeye ekle ({selected.length})</Button>
        {selected.length > 0 && <Button variant="ghost" onClick={() => setSelected([])}>Seçimi kaldır</Button>}
        <span className="text-sm text-muted-foreground">Alım listesinde {purchaseLines.length} ürün</span>
      </div>
      {list.length === 0 ? <p className="border-y py-12 text-center text-muted-foreground">{data.products.length ? "Filtrelere uygun eksik ürün bulunamadı." : "Stoğu tükenen veya minimumun altına düşen ürün yok."}</p> : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full bg-card text-sm">
            <thead className="bg-secondary text-left"><tr><th className="px-3 py-3"><Checkbox aria-label="Bu sayfadaki ürünleri seç" checked={allVisibleSelected ? true : visible.some((p) => selected.includes(p.id)) ? "indeterminate" : false} onCheckedChange={(checked) => setSelected((old) => checked === true ? [...new Set([...old, ...visible.map((p) => p.id)])] : old.filter((id) => !visible.some((p) => p.id === id)))} /></th>{["KM No", "Ürün", "Durum", "Stok", "Min / Max", "Önerilen alım", "Alınacak tedarikçi", "Tedarikçi / Kod"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-3">{h}</th>)}</tr></thead>
            <tbody>{visible.map((p) => <tr key={p.id} className="border-t align-top">
              <td className="px-3 py-3"><Checkbox aria-label={`${p.sku ?? p.name} ürününü seç`} checked={selected.includes(p.id)} onCheckedChange={(checked) => setSelected((old) => checked === true ? [...new Set([...old, p.id])] : old.filter((id) => id !== p.id))} /></td>
              <td className="whitespace-nowrap px-3 py-3 font-oem">{p.sku ?? "—"}</td>
              <td className="min-w-48 px-3 py-3 font-semibold">{p.name}</td>
              <td className={`whitespace-nowrap px-3 py-3 ${p.stock === 0 ? "text-destructive" : "text-warning"}`}>{p.stock === 0 ? "Tükendi" : "Minimum altı"}</td>
              <td className="px-3 py-3">{p.stock}</td><td className="whitespace-nowrap px-3 py-3">{p.min_stock} / {p.max_stock ?? "—"}</td>
              <td className="px-3 py-3"><Input aria-label={`${p.sku ?? p.name} alım adedi`} type="number" min={0} max={100000} step={1} className="w-24" value={quantities[p.id] ?? replenishmentQuantity(p)} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n) && n>=0 && n<=100000)setQuantities(old=>({...old,[p.id]:n}));}}/></td>
              <td className="px-3 py-3"><select aria-label={`${p.sku ?? p.name} alınacak tedarikçi`} className="h-9 w-40 rounded-md border bg-background px-2 text-sm" value={supplierFor(p)} onChange={(e) => setAssigned((old) => ({ ...old, [p.id]: e.target.value }))}><option value="">Tedarikçi seçin</option>{[...new Map(p.suppliers.map((s) => [s.supplier_id, s])).values()].map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>)}</select></td>
              <td className="min-w-44 px-3 py-3">{p.suppliers.length ? p.suppliers.filter(s=>!supplier || s.supplier_id===supplier).map((s, i) => <div key={`${s.supplier_id}-${i}`} className="break-words">{s.name}{s.code && <span className="font-oem text-xs"> · {s.code}</span>}</div>) : <span className="text-muted-foreground">Tedarikçi yok</span>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <Pager page={currentPage} total={list.length} onChange={setPage} />
      <ShortagePurchaseList lines={purchaseLines} products={data.products} onChange={setPurchaseLines} onDownload={downloadPurchaseList} exporting={purchaseExporting} />
    </div>
  );
}