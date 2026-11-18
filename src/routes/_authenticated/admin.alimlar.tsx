import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { date, istanbulDay, money } from "@/lib/format";
import { fetchAll } from "@/lib/fetch-all";
import { compareProductCodes } from "@/lib/catalog-rules";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePurchaseQuantity, isPurchaseQuantity } from "@/lib/purchase-quantity";
import { procurementPurchaseLinks } from "@/lib/supplier-procurement";

export const Route = createFileRoute("/_authenticated/admin/alimlar")({ head: () => ({ meta: [{ title: "Alımlar ve Tedarikçiler — KlipsMarket" }, { name: "description", content: "Ürün alımları ve tedarikçi kayıtları." }, { property: "og:title", content: "Alımlar ve Tedarikçiler — KlipsMarket" }, { property: "og:description", content: "Ürün alımları ve tedarikçi kayıtları." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Purchases });

const productSortOptions = {
  sku: "KM No · artan",
  stockAsc: "Stok · azdan çoğa",
  stockDesc: "Stok · çoktan aza",
  nameAsc: "Ürün adı · A–Z",
  nameDesc: "Ürün adı · Z–A",
};

const historySortOptions = {
  dateDesc: { label: "Alım tarihi · en yeni", column: "purchase_date", ascending: false },
  dateAsc: { label: "Alım tarihi · en eski", column: "purchase_date", ascending: true },
  quantityDesc: { label: "Alım adedi · çoktan aza", column: "quantity", ascending: false },
  quantityAsc: { label: "Alım adedi · azdan çoğa", column: "quantity", ascending: true },
  costDesc: { label: "Birim alış fiyatı · yüksekten düşüğe", column: "unit_cost", ascending: false },
  costAsc: { label: "Birim alış fiyatı · düşükten yükseğe", column: "unit_cost", ascending: true },
} as const;

const productNameCollator = new Intl.Collator("tr", { sensitivity: "base" });
const normalizeProductSearch = (value: string) => value.toLocaleLowerCase("tr").normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i").replace(/[\s.-]+/g, "");
const productPageSize = 25;

function Purchases() {
  const { adminUserId } = Route.useRouteContext();
  const qc = useQueryClient();
  const [f, setF] = useState(() => ({ supplier_id: "", purchase_date: istanbulDay() }));
  const [entries, setEntries] = useState<Record<string, { quantity: number; cost: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  const pendingReceipts = useRef(new Map<string, string>());
  const [sup, setSup] = useState({ name: "", phone: "", address: "" });
  const [page, setPage] = useState(0);
  const [productSearch, setProductSearch] = useState("");
  const [productSort, setProductSort] = useState<keyof typeof productSortOptions>("sku");
  const [productPageIndex, setProductPageIndex] = useState(0);
  const [historySort, setHistorySort] = useState<keyof typeof historySortOptions>("dateDesc");
  const productTable = useRef<HTMLDivElement>(null);
  const { data, isPending: productsPending, isError: productsFailed, isFetching: productsFetching, refetch: refetchProducts } = useQuery({
    queryKey: ["admin-purchases"],
    queryFn: async () => {
      const [s, p, codes] = await Promise.all([
        supabase.from("suppliers").select("*").order("name"),
        fetchAll((from, to) => supabase.from("products").select("id,name,sku,stock,min_stock,max_stock").order("name").order("id").range(from, to)),
        fetchAll((from,to)=>supabase.from("product_supplier_codes").select("product_id,supplier_id,code").order("id").range(from,to)),
      ]);
      if (s.error) throw new Error(s.error.message);
      return { codes, suppliers: s.data ?? [], products: p };
    },
  });
  const { data: list, isPending: historyPending, isError: historyFailed, isFetching: historyFetching, refetch: refetchHistory } = useQuery({
    queryKey: ["admin-purchases", "list", page, f.supplier_id, historySort],
    queryFn: async () => {
      const { column, ascending } = historySortOptions[historySort];
      let request = supabase.from("purchases").select("*, supplier:suppliers(name), product:products(name,sku)", { count: "exact" });
      if (f.supplier_id) request = request.eq("supplier_id", f.supplier_id);
      request = request.order(column, { ascending });
      if (column !== "purchase_date") request = request.order("purchase_date", { ascending: false });
      const r = await request.order("created_at", { ascending: false }).order("id")
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (r.error) throw new Error(r.error.message);
      const links = await procurementPurchaseLinks(r.data.map((row) => row.id));
      return { rows: r.data, total: r.count ?? 0, links: new Map(links.map((link) => [link.purchase_id, link])) };
    },
  });
  const addPurchase = async (productId: string) => {
    const entry = entries[productId] ?? { quantity: 100, cost: "" };
    const cost = Number(entry.cost);
    if (saveInFlight.current || !isPurchaseQuantity(entry.quantity) || !entry.cost.trim() || !Number.isFinite(cost) || cost < 0 || cost > 9999999999.99 || Number(cost.toFixed(2)) !== cost || !f.purchase_date) {
      if (!saveInFlight.current) toast.error("Alım bilgilerini kontrol edin. Birim fiyat en fazla iki ondalık basamak içerebilir.");
      return;
    }
    const row: TablesInsert<"purchases"> = {
      supplier_id: f.supplier_id || null,
      product_id: productId,
      quantity: entry.quantity,
      unit_cost: cost,
      purchase_date: f.purchase_date,
    };
    const key = `klipsmarket:purchase-retry:${adminUserId}:${JSON.stringify(row)}`;
    saveInFlight.current = true;
    setSaving(productId);
    try {
      let id = pendingReceipts.current.get(key);
      try { id ??= sessionStorage.getItem(key) ?? undefined; } catch { /* Session storage is optional. */ }
      id ??= crypto.randomUUID();
      pendingReceipts.current.set(key, id);
      try { sessionStorage.setItem(key, id); } catch { /* Retain the ID in memory. */ }

      const { error } = await supabase.from("purchases").insert({ ...row, id });
      if (error) {
        if (error.code !== "23505") throw new Error(error.message);
        const { data: saved, error: readError } = await supabase.from("purchases")
          .select("supplier_id,product_id,quantity,unit_cost,purchase_date").eq("id", id).maybeSingle();
        if (readError || !saved || saved.supplier_id !== row.supplier_id || saved.product_id !== row.product_id ||
          saved.quantity !== row.quantity || Number(saved.unit_cost) !== row.unit_cost || saved.purchase_date !== row.purchase_date) {
          throw new Error("Önceki alım doğrulanamadı. Alım geçmişini kontrol edin.");
        }
      }

      pendingReceipts.current.delete(key);
      try { sessionStorage.removeItem(key); } catch { /* The receipt is already saved. */ }
      toast.success(error ? "Bu alım zaten kaydedilmişti." : "Alım kaydedildi, stok güncellendi");
      setEntries((old) => { const next = { ...old }; delete next[productId]; return next; });
      await qc.invalidateQueries();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Alım kaydedilemedi."); }
    finally { saveInFlight.current = false; setSaving(null); }
  };
  const addSupplier = async () => {
    const { error } = await supabase.from("suppliers").insert(sup);
    if (error) { toast.error(error.message); return; }
    setSup({ name: "", phone: "", address: "" }); qc.invalidateQueries();
  };
  const del = async (id: string) => {
    if (!confirm("Alım silinsin mi? Stoktan düşülecek.")) return;
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) {
      toast.error(error.code === "23514" ? "Alım silinemedi. Bu alımı çıkarmak stoğu sıfırın altına düşürür." : error.message);
      return;
    }
    toast.success("Alım silindi, stok güncellendi.");
    qc.invalidateQueries();
  };
  const codesByProduct = useMemo(() => {
    const codes = new Map<string, string[]>();
    for (const link of data?.codes ?? []) {
      if (f.supplier_id && link.supplier_id !== f.supplier_id) continue;
      const productCodes = codes.get(link.product_id) ?? [];
      if (link.code) productCodes.push(link.code);
      codes.set(link.product_id, productCodes);
    }
    return codes;
  }, [data?.codes, f.supplier_id]);
  const term = normalizeProductSearch(productSearch);
  const available = useMemo(() => (data?.products ?? [])
    .filter((product) => {
      const codes = codesByProduct.get(product.id);
      if (f.supplier_id && !codes) return false;
      return !term || [product.sku ?? "", product.name, ...(codes ?? [])].some((value) => normalizeProductSearch(value).includes(term));
    })
    .sort((a, b) => {
      switch (productSort) {
        case "stockAsc": return a.stock - b.stock || compareProductCodes(a, b);
        case "stockDesc": return b.stock - a.stock || compareProductCodes(a, b);
        case "nameAsc": return productNameCollator.compare(a.name, b.name) || compareProductCodes(a, b);
        case "nameDesc": return productNameCollator.compare(b.name, a.name) || compareProductCodes(a, b);
        default: return compareProductCodes(a, b);
      }
    }), [data?.products, codesByProduct, f.supplier_id, productSort, term]);
  const productPage = Math.min(productPageIndex, Math.max(0, Math.ceil(available.length / productPageSize) - 1));
  const visibleProducts = available.slice(productPage * productPageSize, (productPage + 1) * productPageSize);

  function changeProductPage(next: number) {
    setProductPageIndex(next);
    if (productTable.current) productTable.current.scrollTop = 0;
  }

  function selectSupplier(id: string) {
    setF((current) => ({ ...current, supplier_id: id }));
    setEntries({});
    setPage(0);
    changeProductPage(0);
  }
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
      <section className="min-w-0 space-y-6">
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-bold">{f.supplier_id ? `${data?.suppliers.find(s=>s.id===f.supplier_id)?.name ?? ""} ürünleri` : "Tüm ürünler"}</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="purchase-product-sort">Ürün sıralaması</Label>
                <select id="purchase-product-sort" className="block h-9 max-w-full rounded-md border bg-background px-2 text-sm" value={productSort} onChange={(e) => {
                  setProductSort(e.target.value as keyof typeof productSortOptions);
                  changeProductPage(0);
                }}>
                  {Object.entries(productSortOptions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label htmlFor="purchase-date">Alım tarihi</Label><Input id="purchase-date" type="date" value={f.purchase_date} disabled={saving !== null} onChange={(e) => setF({ ...f, purchase_date: e.target.value })} /></div>
            </div>
          </div>
          <div className="max-w-md space-y-1">
            <Label htmlFor="purchase-product-search">Ürün ara</Label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="purchase-product-search" type="search" className="pl-9" placeholder="KM No, ürün adı veya tedarikçi kodu" value={productSearch} maxLength={200} onChange={(e) => {
                setProductSearch(e.target.value);
                changeProductPage(0);
              }} />
            </div>
          </div>
          {productsPending && !productsFailed && <p role="status" className="text-sm text-muted-foreground">Ürün ve tedarikçi bilgileri yükleniyor…</p>}
          {productsFailed && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
            {data ? "Ürün ve tedarikçi bilgileri yenilenemedi. Son yüklenen bilgiler gösteriliyor." : "Ürün ve tedarikçi bilgileri yüklenemedi."}
            <Button size="sm" variant="outline" disabled={productsFetching} onClick={() => void refetchProducts()}>Tekrar dene</Button>
          </div>}
          <div ref={productTable} className="max-h-96 overflow-auto border"><table className="w-full bg-card text-sm"><thead className="sticky top-0 bg-secondary text-left"><tr>{["KM No / Ürün", "Tedarikçi stok kodu", "Stok", "Alım"].map(h=><th key={h} className="p-2 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{visibleProducts.map(p=>{
            const entry = entries[p.id] ?? { quantity: 100, cost: "" };
            const name = p.sku ?? p.name;
            const update = (patch: Partial<typeof entry>) => setEntries(old=>({...old,[p.id]:{...entry,...patch}}));
            return <tr key={p.id} className="border-t"><td className="min-w-48 p-2">{p.sku} · {p.name}</td><td className="p-2 font-oem">{codesByProduct.get(p.id)?.join(", ") || "—"}</td><td className="p-2">{p.stock}</td><td className="p-2"><div className="space-y-2"><div className="flex items-center gap-1"><Button size="icon" variant="outline" aria-label={`${name} 100 azalt`} title="100 azalt" disabled={entry.quantity===100 || saving!==null} onClick={()=>update({quantity:changePurchaseQuantity(entry.quantity,-1)})}><Minus /></Button><Input className="w-24 text-center" aria-label={`${name} alım adedi`} type="number" min={100} step={100} value={entry.quantity} disabled={saving!==null} onChange={e=>{const quantity=Number(e.target.value);if(isPurchaseQuantity(quantity))update({quantity});}}/><Button size="icon" variant="outline" aria-label={`${name} 100 artır`} title="100 artır" disabled={saving!==null} onClick={()=>update({quantity:changePurchaseQuantity(entry.quantity,1)})}><Plus /></Button></div><div className="flex items-center gap-2"><Input placeholder="Alış fiyatı ₺" className="w-28" aria-label={`${name} alış fiyatı`} type="number" min={0} step="0.01" value={entry.cost} disabled={saving!==null} onChange={e=>update({cost:e.target.value})}/><Button size="sm" aria-label={`${name} alım ekle`} onClick={()=>void addPurchase(p.id)} disabled={saving!==null || entry.cost==="" || Number(entry.cost)<0 || !f.purchase_date}>{saving===p.id ? "Kaydediliyor…" : "Alım ekle"}</Button></div></div></td></tr>;
          })}</tbody></table>{data && available.length === 0 && <p role="status" className="p-4 text-muted-foreground">{term ? "Aramanızla eşleşen ürün bulunamadı." : f.supplier_id ? "Bu tedarikçiye bağlı ürün yok." : "Henüz ürün yok."}</p>}</div>
          <nav aria-label="Alım ürünleri sayfaları"><Pager page={productPage} total={available.length} pageSize={productPageSize} onChange={changeProductPage} /></nav>
        </section>
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-bold">Alım geçmişi</h2>
            <div className="max-w-full space-y-1">
              <Label htmlFor="purchase-history-sort">Geçmiş sıralaması</Label>
              <select id="purchase-history-sort" className="block h-9 max-w-full rounded-md border bg-background px-2 text-sm" value={historySort} onChange={(e) => {
                setHistorySort(e.target.value as keyof typeof historySortOptions);
                setPage(0);
              }}>
                {Object.entries(historySortOptions).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
              </select>
            </div>
          </div>
          {historyPending && !historyFailed && <p role="status" className="text-sm text-muted-foreground">Alım geçmişi yükleniyor…</p>}
          {historyFailed && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm">
            {list ? "Alım geçmişi yenilenemedi. Son yüklenen kayıtlar gösteriliyor." : "Alım geçmişi yüklenemedi."}
            <Button size="sm" variant="outline" disabled={historyFetching} onClick={() => void refetchHistory()}>Tekrar dene</Button>
          </div>}
          {list && <div className="overflow-x-auto"><table className="w-full rounded-md border bg-card text-sm">
          <thead className="bg-secondary text-left"><tr><th className="p-2">Tarih</th><th className="p-2">Ürün</th><th className="p-2">Tedarikçi</th><th className="p-2 text-right">Adet</th><th className="p-2 text-right">Alış fiyatı</th><th className="p-2 text-right">Toplam</th><th /></tr></thead>
          <tbody>
            {list?.rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Henüz alım yok</td></tr>}
            {list?.rows.map((p) => {
              const source = list.links.get(p.id);
              return <tr key={p.id} className="border-t"><td className="p-2">{date(p.purchase_date)}</td><td className="p-2">{p.product?.sku && <span className="font-oem mr-1 text-xs text-muted-foreground">{p.product.sku}</span>}{p.product?.name}{source?.reversed_at && <span className="ml-2 whitespace-nowrap text-xs font-medium text-destructive">Ters kayıt</span>}</td><td className="p-2">{p.supplier?.name ?? "—"}</td><td className="p-2 text-right">{p.quantity}</td><td className="p-2 text-right">{money(p.unit_cost)}</td><td className="p-2 text-right font-semibold">{money(p.quantity * Number(p.unit_cost))}</td>
              <td className="p-2">{source ? <Link to="/admin/tedarikci-siparisleri/$id" params={{ id: source.order_id }} search={{ kabul: source.receipt_id }} className="whitespace-nowrap text-sm font-medium underline">Kabul #{source.receipt_no}</Link>
                : <button type="button" onClick={() => del(p.id)} className="text-muted-foreground hover:text-destructive" aria-label="Sil"><Trash2 className="h-4 w-4" /></button>}</td></tr>;
            })}
          </tbody>
          </table></div>}
          {list && <Pager page={page} total={list.total} onChange={setPage} />}
        </section>
      </section>
      <aside className="space-y-3 rounded-md border bg-card p-4">
        <h3 className="font-extrabold">Tedarikçi firmalar</h3><Button variant="outline" size="sm" disabled={saving!==null} onClick={() => selectSupplier("")}>Tüm tedarikçiler</Button>
        <ul className="space-y-1 text-sm">{data?.suppliers.map((s) => <li key={s.id}><Button size="sm" disabled={saving!==null} variant={f.supplier_id===s.id?"secondary":"ghost"} onClick={() => selectSupplier(s.id)}>{s.name}</Button> <span className="text-muted-foreground">{s.phone}</span></li>)}</ul>
        <Input placeholder="Firma adı" value={sup.name} onChange={(e) => setSup({ ...sup, name: e.target.value })} />
        <Input placeholder="Telefon" value={sup.phone} onChange={(e) => setSup({ ...sup, phone: e.target.value })} />
        <Input placeholder="Adres" value={sup.address} onChange={(e) => setSup({ ...sup, address: e.target.value })} />
        <Button className="w-full" onClick={addSupplier} disabled={!sup.name}>Tedarikçi ekle</Button>
      </aside>
    </div>
  );
}
