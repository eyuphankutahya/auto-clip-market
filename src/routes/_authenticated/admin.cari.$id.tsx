import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CariStatement } from "@/components/site/CariStatement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/cari/$id")({ head: () => ({ meta: [{ title: "Cari Hesap Detayı — KlipsMarket" }, { name: "description", content: "Müşteri cari hareketleri, iskonto ve tahsilatlar." }, { property: "og:title", content: "Cari Hesap Detayı — KlipsMarket" }, { property: "og:description", content: "Müşteri cari hareketleri, iskonto ve tahsilatlar." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: AccountDetail });

function AccountDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: acc } = useQuery({ queryKey: ["account", id], queryFn: async () => (await supabase.from("customer_accounts").select("*").eq("id", id).single()).data });
  const [f, setF] = useState({ company_name: "", address: "", phone: "", notes: "", discount_rate: "0" });
  const [pay, setPay] = useState({ amount: "", method: "Havale", description: "" });
  useEffect(() => { if (acc) setF({ company_name: acc.company_name, address: acc.address ?? "", phone: acc.phone ?? "", notes: acc.notes ?? "", discount_rate: String(acc.discount_rate) }); }, [acc]);
  const save = async () => {
    const { error } = await supabase.from("customer_accounts").update({ ...f, discount_rate: Number(f.discount_rate) }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Güncellendi"); qc.invalidateQueries(); }
  };
  const addPayment = async () => {
    const { error } = await supabase.from("account_transactions").insert({ customer_account_id: id, type: "credit", amount: Number(pay.amount), payment_method: pay.method, description: pay.description || "Tahsilat" });
    if (error) { toast.error(error.message); return; }
    toast.success("Tahsilat kaydedildi"); setPay({ amount: "", method: "Havale", description: "" }); qc.invalidateQueries();
  };
  if (!acc) return <p className="text-muted-foreground">Yükleniyor…</p>;
  return (
    <div className="space-y-8">
      <Link to="/admin/cariler" className="text-sm text-accent">← Cari hesaplar</Link>
      <h2 className="text-2xl font-extrabold">{acc.company_name}</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-3 rounded-md border bg-card p-4">
          <h3 className="font-extrabold">Cari bilgileri</h3>
          <div><Label>Firma adı</Label><Input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Telefon</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div><div><Label>İskonto (%)</Label><Input type="number" value={f.discount_rate} onChange={(e) => setF({ ...f, discount_rate: e.target.value })} /></div></div>
          <div><Label>Adres</Label><Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
          <div><Label>Açıklama</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <Button onClick={save}>Güncelle</Button>
        </div>
        <div className="grid content-start gap-3 rounded-md border bg-card p-4">
          <h3 className="font-extrabold">Tahsilat gir</h3>
          <div className="grid grid-cols-2 gap-3"><div><Label>Tutar (₺)</Label><Input type="number" step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></div>
            <div><Label>Ödeme yöntemi</Label><select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{["Havale", "Nakit", "Kredi kartı", "Çek", "Senet"].map((m) => <option key={m}>{m}</option>)}</select></div></div>
          <div><Label>Açıklama</Label><Input value={pay.description} onChange={(e) => setPay({ ...pay, description: e.target.value })} /></div>
          <Button onClick={addPayment} disabled={!(Number(pay.amount) > 0)}>Tahsilatı kaydet</Button>
        </div>
      </div>
      <CariStatement accountId={id} />
    </div>
  );
}
