import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { compareProductCodes } from "@/lib/catalog-rules";
import { alertLevel, needsAlert } from "@/lib/stock-alerts";
import { Pager, PAGE_SIZE } from "@/components/site/Pager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const T = "Stok Uyarı Ayarları — KlipsMarket";
const D = "Ürün bazında kritik stok eşiği ve uyarı tercihleri.";
export const Route = createFileRoute("/_authenticated/admin/stok-uyarilari")({ head: () => ({ meta: [{ title: T }, { name: "description", content: D }, { property: "og:title", content: T }, { property: "og:description", content: D }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: AlertSettings });

type Row = { id: string; sku: string | null; name: string; stock: number; min_stock: number; stock_alert_enabled: boolean; stock_alert_threshold: number | null };

function AlertSettings() {
  const qc = useQueryClient();
  const [q, setQ] = useState(""); const [view, setView] = useState("all"); const [page, setPage] = useState(0);
  const { data } = useQuery({
    queryKey: ["alert-settings"],
    queryFn: async () => (await fetchAll((a, b) => supabase.from("products").select("id,sku,name,stock,min_stock,stock_alert_enabled,stock_alert_threshold").order("id").range(a, b)) as Row[]).sort((x, y) => compareProductCodes(x.sku, y.sku)),
  });
  const save = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Uyarı tercihi kaydedildi"); qc.invalidateQueries();
  };
  const n = q.trim().toLocaleLowerCase("tr");
  const list = (data ?? []).filter((p) => (!n || `${p.sku ?? ""} ${p.name}`.toLocaleLowerCase("tr").includes(n)) && (view === "all" || (view === "alerting" ? needsAlert(p) : view === "off" ? !p.stock_alert_enabled : p.stock_alert_threshold !== null)));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Uyarı eşiği boş bırakılırsa ürünün minimum stoğu kullanılır. Stok eşiğin altına düştüğünde ya da tükendiğinde Özet ekranında uyarı görünür. Uyarısı kapalı ürünler listelenmez.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="KM No veya ürün adı" className="max-w-xs" />
        <select aria-label="Görünüm" value={view} onChange={(e) => { setView(e.target.value); setPage(0); }} className="rounded-md border bg-background p-2 text-sm">
          <option value="all">Tüm ürünler</option><option value="alerting">Şu an uyarı verenler</option><option value="custom">Özel eşikli</option><option value="off">Uyarısı kapalı</option>
        </select>
        <span className="text-sm text-muted-foreground">{list.length} ürün</span>
      </div>
      <div className="overflow-x-auto rounded-md border"><table className="w-full bg-card text-sm">
        <thead className="bg-secondary text-left"><tr><th className="p-2">KM No</th><th className="p-2">Ürün</th><th className="p-2 text-right">Stok</th><th className="p-2 text-right">Min</th><th className="p-2">Uyarı</th><th className="p-2 text-right">Uyarı eşiği</th><th className="p-2">Durum</th></tr></thead>
        <tbody>
          {!data && <tr><td colSpan={7} className="p-4 text-muted-foreground">Yükleniyor…</td></tr>}
          {list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((p) => (
            <tr key={p.id} className="border-t">
              <td className="font-oem p-2 text-xs font-semibold">{p.sku ?? "—"}</td><td className="p-2">{p.name}</td>
              <td className="p-2 text-right font-semibold">{p.stock}</td><td className="p-2 text-right text-muted-foreground">{p.min_stock}</td>
              <td className="p-2"><label className="flex items-center gap-2"><input type="checkbox" checked={p.stock_alert_enabled} onChange={(e) => save(p.id, { stock_alert_enabled: e.target.checked })} />{p.stock_alert_enabled ? "Açık" : "Kapalı"}</label></td>
              <td className="p-2"><Threshold key={`${p.id}-${p.stock_alert_threshold}`} value={p.stock_alert_threshold} min={p.min_stock} onSave={(v) => save(p.id, { stock_alert_threshold: v })} /></td>
              <td className="p-2">{needsAlert(p) ? <span className={`rounded-sm px-2 py-0.5 text-xs font-bold ${p.stock <= 0 ? "bg-destructive text-destructive-foreground" : "bg-warning text-ink"}`}>{p.stock <= 0 ? "Tükendi" : "Kritik"}</span> : <span className="text-xs text-muted-foreground">Eşik {alertLevel(p)}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <Pager page={page} total={list.length} onChange={setPage} />
    </div>
  );
}

function Threshold({ value, min, onSave }: { value: number | null; min: number; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value === null ? "" : String(value));
  const next = v.trim() === "" ? null : Number(v);
  const invalid = next !== null && (!Number.isInteger(next) || next < 0);
  return <div className="flex items-center justify-end gap-1">
    <Input aria-label="Uyarı eşiği" type="number" min={0} step={1} placeholder={`Min (${min})`} value={v} onChange={(e) => setV(e.target.value)} className="h-8 w-24 text-right" />
    <Button size="sm" variant="outline" disabled={next === value} onClick={() => invalid ? toast.error("Eşik sıfır veya pozitif tam sayı olmalı") : onSave(next)}>Kaydet</Button>
  </div>;
}
