import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { money, slugify } from "@/lib/format";
import { buildPlan, detectColumns, type Columns, type ImportRow, type Plan } from "@/lib/stock-import";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/aktarim")({ component: StockImport });

const historyQuery = queryOptions({
  queryKey: ["stock-adjustments"],
  queryFn: async () => {
    const { data, error } = await supabase.from("stock_adjustments").select("id, new_stock, previous_stock, reason, created_at, product:products(sku, name)").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  },
});

const chunks = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

function StockImport() {
  const { data: cat } = useQuery(catalogQuery);
  const { data: history } = useQuery(historyQuery);
  const qc = useQueryClient();
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [cols, setCols] = useState<Columns>({});
  const [busy, setBusy] = useState(false);

  const plan: Plan | null = cat && rows.length ? buildPlan(rows, cols, cat.products) : null;

  const read = async (f: File) => {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await f.arrayBuffer());
    const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
    const json = sheet ? XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" }) : [];
    const hs = json[0] ? Object.keys(json[0]) : [];
    setFile(f.name); setRows(json); setHeaders(hs); setCols(detectColumns(hs));
    if (!json.length) toast.error("Dosyanın ilk sayfasında satır bulunamadı");
  };

  const template = async () => {
    if (!cat) return;
    const XLSX = await import("xlsx");
    const data = [...cat.products].sort((a, b) => (a.sku ?? "").localeCompare(b.sku ?? "", "tr", { numeric: true }))
      .map((p) => ({ "KM No": p.sku ?? "", "Stok Açıklaması": p.name, "Stok Adedi": p.stock, "Satış Fiyatı": Number(p.price) || "" }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 10 }, { wch: 50 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Stok");
    XLSX.writeFile(wb, `klipsmarket-stok-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const apply = async () => {
    if (!plan) return;
    setBusy(true);
    const reason = `Toplu aktarım: ${file}`;
    try {
      // New product cards
      for (const part of chunks(plan.creates, 200)) {
        const { data, error } = await supabase.from("products").insert(part.map((c) => ({ sku: c.sku, name: c.name, slug: slugify(`${c.name} km ${c.sku}`), price: c.price, needs_review: true }))).select("id, sku");
        if (error) throw error;
        const adj = part.filter((c) => c.stock > 0).map((c) => ({ product_id: data.find((d) => d.sku === c.sku)!.id, new_stock: c.stock, reason }));
        if (adj.length) { const r = await supabase.from("stock_adjustments").insert(adj); if (r.error) throw r.error; }
      }
      // Stock counts (a trigger writes the new stock onto the product)
      const stockRows = plan.updates.filter((u) => u.stock !== undefined).map((u) => ({ product_id: u.id, new_stock: u.stock!, reason }));
      for (const part of chunks(stockRows, 500)) { const r = await supabase.from("stock_adjustments").insert(part); if (r.error) throw r.error; }
      // Prices
      const priceRows = plan.updates.filter((u) => u.price !== undefined);
      for (const part of chunks(priceRows, 10)) {
        const res = await Promise.all(part.map((u) => supabase.from("products").update({ price: u.price! }).eq("id", u.id)));
        const err = res.find((r) => r.error)?.error; if (err) throw err;
      }
      toast.success(`Aktarım tamam: ${plan.updates.length} ürün güncellendi, ${plan.creates.length} yeni kart açıldı`);
      setRows([]); setFile("");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(`Aktarım yarıda kaldı: ${(e as Error).message}`);
      qc.invalidateQueries();
    } finally { setBusy(false); }
  };

  const colSelect = (k: keyof Columns, label: string) => (
    <div><Label>{label}</Label>
      <select className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={cols[k] ?? ""} onChange={(e) => setCols({ ...cols, [k]: e.target.value || undefined })}>
        <option value="">— yok —</option>{headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );

  const stockCount = plan?.updates.filter((u) => u.stock !== undefined).length ?? 0;
  const priceCount = plan?.updates.filter((u) => u.price !== undefined).length ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="min-w-0 space-y-5">
        <div>
          <h2 className="font-extrabold">Toplu stok ve ürün kartı aktarımı</h2>
          <p className="mt-1 text-sm text-muted-foreground">Excel veya CSV dosyası yükleyin. Ürünler KM No ile eşleşir; KM No sitede yoksa ve ürün adı yazılıysa yeni ürün kartı açılır. Dosyadaki stok adedi ürünün yeni stoğu olur.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <FileUp className="h-4 w-4" />Dosya seç
            <input type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ""; }} />
          </label>
          <Button variant="outline" onClick={template} disabled={!cat}><Download className="h-4 w-4" />Mevcut stok listesini indir</Button>
        </div>
        <p className="text-xs text-muted-foreground">İpucu: "Mevcut stok listesini indir" ile tüm ürünleri Excel olarak alın, stok ve fiyat sütunlarını doldurup aynı dosyayı geri yükleyin.</p>

        {file && plan && (
          <div className="space-y-4 rounded-md border bg-card p-4">
            <div className="text-sm"><span className="font-semibold">{file}</span> · {rows.length} satır</div>
            <div className="grid gap-3 sm:grid-cols-4">
              {colSelect("sku", "KM No sütunu")}{colSelect("name", "Ürün adı sütunu")}{colSelect("stock", "Stok adedi sütunu")}{colSelect("price", "Satış fiyatı sütunu")}
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-4">
              <Stat n={stockCount} label="stok değişecek" />
              <Stat n={priceCount} label="fiyat değişecek" />
              <Stat n={plan.creates.length} label="yeni ürün kartı" />
              <Stat n={plan.unchanged} label="değişiklik yok" />
            </div>
            {plan.problems.length > 0 && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <div className="mb-1 font-semibold">{plan.problems.length} satır atlanacak</div>
                <ul className="max-h-40 space-y-0.5 overflow-y-auto text-xs">{plan.problems.map((p) => <li key={p.row}>Satır {p.row}: {p.reason}</li>)}</ul>
              </div>
            )}
            {(plan.updates.length > 0 || plan.creates.length > 0) && (
              <div className="max-h-[420px] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-secondary text-left"><tr><th className="p-2">KM No</th><th className="p-2">Ürün</th><th className="p-2 text-right">Stok</th><th className="p-2 text-right">Fiyat</th></tr></thead>
                  <tbody>
                    {plan.creates.map((c) => <tr key={`n${c.sku}`} className="border-t"><td className="font-oem p-2 text-xs font-semibold">{c.sku}</td><td className="p-2">{c.name} <span className="ml-1 rounded bg-accent/15 px-1.5 text-xs font-semibold text-accent">Yeni kart</span></td><td className="p-2 text-right">{c.stock}</td><td className="p-2 text-right">{c.price > 0 ? money(c.price) : "—"}</td></tr>)}
                    {plan.updates.map((u) => <tr key={u.id} className="border-t"><td className="font-oem p-2 text-xs font-semibold">{u.sku ?? "—"}</td><td className="p-2">{u.name}</td>
                      <td className="p-2 text-right whitespace-nowrap">{u.stock !== undefined ? <><span className="text-muted-foreground line-through">{u.oldStock}</span> → <b>{u.stock}</b></> : u.oldStock}</td>
                      <td className="p-2 text-right whitespace-nowrap">{u.price !== undefined ? <><span className="text-muted-foreground line-through">{u.oldPrice > 0 ? money(u.oldPrice) : "—"}</span> → <b>{money(u.price)}</b></> : u.oldPrice > 0 ? money(u.oldPrice) : "—"}</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={apply} disabled={busy || (plan.updates.length === 0 && plan.creates.length === 0)}>{busy ? "Aktarılıyor…" : "Değişiklikleri uygula"}</Button>
              <Button variant="ghost" onClick={() => { setRows([]); setFile(""); }} disabled={busy}>Vazgeç</Button>
            </div>
          </div>
        )}
      </section>

      <aside>
        <h3 className="mb-2 font-extrabold">Son stok hareketleri</h3>
        <div className="max-h-[640px] overflow-y-auto rounded-md border bg-card">
          <table className="w-full text-xs">
            <tbody>{history?.map((h) => (
              <tr key={h.id} className="border-t first:border-t-0"><td className="p-2"><div className="font-semibold"><span className="font-oem">{h.product?.sku}</span> {h.product?.name}</div><div className="text-muted-foreground">{h.reason} · {new Date(h.created_at).toLocaleString("tr-TR")}</div></td>
                <td className="p-2 text-right whitespace-nowrap">{h.previous_stock ?? "—"} → <b>{h.new_stock}</b></td></tr>
            ))}</tbody>
          </table>
          {history?.length === 0 && <p className="p-3 text-xs text-muted-foreground">Henüz hareket yok.</p>}
        </div>
      </aside>
    </div>
  );
}

const Stat = ({ n, label }: { n: number; label: string }) => (
  <div className="rounded-md bg-secondary p-3"><div className="text-xl font-extrabold">{n}</div><div className="text-xs text-muted-foreground">{label}</div></div>
);
