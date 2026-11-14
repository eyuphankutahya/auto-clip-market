import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { catalogQuery } from "@/lib/catalog";
import { buildNewProductArgs, emptyNewProduct, type NewProductForm } from "@/lib/new-product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/urun-ekle")({
  head: () => ({ meta: [
    { title: "Yeni Ürün Ekle — KlipsMarket" },
    { name: "description", content: "Ürün, stok, OEM, araç ve tedarikçi bilgilerini tek ekrandan ekleyin." },
    { property: "og:title", content: "Yeni Ürün Ekle — KlipsMarket" },
    { property: "og:description", content: "Ürün, stok, OEM, araç ve tedarikçi bilgilerini tek ekrandan ekleyin." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: NewProductPage,
});

const suppliersQuery = queryOptions({
  queryKey: ["admin-product-suppliers"],
  queryFn: async () => {
    const { data, error } = await supabase.from("suppliers").select("id, name").order("name");
    if (error) throw error;
    return data;
  },
});

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-lg border bg-card p-5 shadow-sm"><div className="mb-4"><h2 className="font-display text-lg font-bold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>{children}</section>;
}

function NewProductPage() {
  const { data: catalog } = useQuery(catalogQuery);
  const { data: suppliers } = useQuery(suppliersQuery);
  const [form, setForm] = useState<NewProductForm>({ ...emptyNewProduct });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const set = <K extends keyof NewProductForm>(key: K, value: NewProductForm[K]) => setForm((old) => ({ ...old, [key]: value }));
  const toggle = (key: "brands" | "models", id: string) => set(key, form[key].includes(id) ? form[key].filter((item) => item !== id) : [...form[key], id]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!catalog || busy) return;
    setBusy(true);
    try {
      const args = buildNewProductArgs(form, catalog.models);
      const { error } = await supabase.rpc("create_admin_product", args);
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success("Ürün ve tüm bağlantıları kaydedildi");
      await navigate({ to: "/admin/urunler" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ürün kaydedilemedi";
      toast.error(message.includes("products_sku_key") ? "Bu KlipsMarket No başka bir üründe kullanılıyor" : message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={save} className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><Link to="/admin/urunler" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Ürünlere dön</Link><h1 className="font-display text-2xl font-extrabold">Yeni ürün ekle</h1><p className="text-sm text-muted-foreground">Temel bilgileri girin, araç ve tedarikçi bağlantılarını seçin.</p></div>
        <Button type="submit" disabled={busy || !catalog}>{busy ? "Kaydediliyor…" : <><Save className="h-4 w-4" />Ürünü kaydet</>}</Button>
      </div>

      <Section title="Ürün bilgileri" description="Müşterilerin göreceği temel ürün bilgileri.">
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <Field label="KlipsMarket No"><Input className="font-oem" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="Örn. 2000" /></Field>
          <Field label="Ürün adı (stok açıklaması) *"><Input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ürünün müşteriye görünen adı" /></Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Kullanım yeri / ürün grubu" hint="Boş bırakılırsa ürün kontrol edilecekler listesine girer."><select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">Seçilmedi</option>{catalog?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
          <Field label="Satış fiyatı (₺)" hint="Boş bırakılırsa müşteriye 'Fiyat yakında' gösterilir."><Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Fiyat henüz yok" /></Field>
          <Field label="Paket içi adet" hint="Bilgi amaçlıdır; fiyat ve sipariş adedini değiştirmez."><Input type="number" min="1" step="1" value={form.package_quantity} onChange={(e) => set("package_quantity", e.target.value)} placeholder="Belirlenmedi" /></Field>
          <Field label="Görsel adresi"><Input type="url" value={form.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://…" /></Field>
        </div>
        <div className="mt-4"><Field label="Açıklama"><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Ölçü, malzeme, renk veya kullanım bilgisi" /></Field></div>
      </Section>

      <Section title="Stok bilgileri" description="Açılış stoğu, stok hareketleri geçmişine otomatik kaydedilir.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Açılış stoğu"><Input required type="number" min="0" step="1" value={form.stock} onChange={(e) => set("stock", e.target.value)} /></Field>
          <Field label="Minimum stok"><Input required type="number" min="0" step="1" value={form.min_stock} onChange={(e) => set("min_stock", e.target.value)} /></Field>
          <Field label="Maksimum stok"><Input type="number" min={Number(form.min_stock) || 0} step="1" value={form.max_stock} onChange={(e) => set("max_stock", e.target.value)} placeholder="Belirlenmedi" /></Field>
        </div>
      </Section>

      <Section title="OEM numaraları" description="Aynı ürüne ait birden fazla OEM numarasını virgül, noktalı virgül veya yeni satırla ayırın.">
        <Textarea className="font-oem min-h-24" value={form.oems} onChange={(e) => set("oems", e.target.value)} placeholder="Örn. 123456789, 987654321" />
      </Section>

      <Section title="Uyumlu araçlar" description="Tüm modeller için markayı, yalnızca belirli araçlar için modelleri seçin. Birden fazla seçim yapabilirsiniz.">
        <div className="grid max-h-96 gap-4 overflow-y-auto rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog?.brands.map((brand) => <div key={brand.id}>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.brands.includes(brand.id)} onChange={() => toggle("brands", brand.id)} />{brand.name} <span className="font-normal text-muted-foreground">(tümü)</span></label>
            <div className="ml-5 mt-1 space-y-1">{catalog.models.filter((model) => model.brand_id === brand.id).map((model) => <label key={model.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.models.includes(model.id)} onChange={() => toggle("models", model.id)} />{model.name}</label>)}</div>
          </div>)}
        </div>
      </Section>

      <Section title="Tedarikçiler ve ürün kodları" description="Birden fazla tedarikçi ve her tedarikçi için birden fazla kod girebilirsiniz. Bu bilgiler yalnızca yöneticiye görünür.">
        <div className="grid gap-3 sm:grid-cols-2">
          {suppliers?.map((supplier) => {
            const value = form.sups[supplier.id] ?? { on: false, code: "" };
            const update = (next: { on: boolean; code: string }) => set("sups", { ...form.sups, [supplier.id]: next });
            return <div key={supplier.id} className="rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={value.on} onChange={(e) => update({ ...value, on: e.target.checked })} />{supplier.name}</label>
              <Textarea aria-label={`${supplier.name} ürün kodları`} className="font-oem mt-2 min-h-20" value={value.code} onChange={(e) => update({ on: true, code: e.target.value })} placeholder="Kodları virgül veya yeni satırla ayırın" />
            </div>;
          })}
        </div>
      </Section>

      <div className="flex justify-end gap-2 border-t pt-5"><Button type="button" variant="outline" asChild><Link to="/admin/urunler">Vazgeç</Link></Button><Button type="submit" disabled={busy || !catalog}>{busy ? "Kaydediliyor…" : <><Save className="h-4 w-4" />Ürünü kaydet</>}</Button></div>
    </form>
  );
}
