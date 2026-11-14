import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/format";
import { fetchAll } from "@/lib/fetch-all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/cariler")({ component: Accounts });

function Accounts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ user_id: "", company_name: "", address: "", phone: "", notes: "", discount_rate: "0" });
  const { data } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const [accounts, profiles, balances] = await Promise.all([
        fetchAll((from, to) => supabase.from("customer_accounts").select("*").order("company_name").order("id").range(from, to)),
        fetchAll((from, to) => supabase.from("profiles").select("id,email,full_name").order("email").order("id").range(from, to)),
        fetchAll((from, to) => supabase.from("account_balances").select("customer_account_id,balance").order("customer_account_id").range(from, to)),
      ]);
      const bal = new Map(balances.map((b) => [b.customer_account_id ?? "", Number(b.balance ?? 0)]));
      return { accounts, profiles, bal };
    },
  });
  const used = new Set(data?.accounts.map((a) => a.user_id));
  const create = async () => {
    const { error } = await supabase.from("customer_accounts").insert({ ...f, user_id: f.user_id || null, discount_rate: Number(f.discount_rate) });
    if (error) { toast.error(error.message); return; }
    toast.success("Cari hesap açıldı"); setOpen(false); setF({ user_id: "", company_name: "", address: "", phone: "", notes: "", discount_rate: "0" });
    qc.invalidateQueries();
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold">Cari hesaplar</h2><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Cari hesap aç</Button></div>
      <table className="w-full rounded-md border bg-card text-sm">
        <thead className="bg-secondary text-left"><tr><th className="p-2">Firma</th><th className="p-2">Kullanıcı</th><th className="p-2">Telefon</th><th className="p-2 text-right">İskonto</th><th className="p-2 text-right">Bakiye</th></tr></thead>
        <tbody>
          {data?.accounts.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Henüz cari hesap yok</td></tr>}
          {data?.accounts.map((a) => (
            <tr key={a.id} className="border-t hover:bg-secondary/50">
              <td className="p-2 font-semibold"><Link to="/admin/cari/$id" params={{ id: a.id }} className="text-accent hover:underline">{a.company_name}</Link></td>
              <td className="p-2 text-muted-foreground">{data.profiles.find((p) => p.id === a.user_id)?.email ?? "—"}</td>
              <td className="p-2">{a.phone}</td><td className="p-2 text-right">%{Number(a.discount_rate)}</td>
              <td className="p-2 text-right font-semibold">{money(data.bal.get(a.id) ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cari hesap aç</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Kullanıcı (sisteme kayıtlı)</Label>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })}>
                <option value="">Kullanıcı seçin</option>
                {data?.profiles.filter((p) => !used.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.email}{p.full_name ? ` (${p.full_name})` : ""}</option>)}
              </select></div>
            <div><Label>Firma adı</Label><Input value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telefon</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
              <div><Label>İskonto (%)</Label><Input type="number" value={f.discount_rate} onChange={(e) => setF({ ...f, discount_rate: e.target.value })} /></div>
            </div>
            <div><Label>Adres</Label><Textarea value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            <div><Label>Açıklama</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
            <Button onClick={create} disabled={!f.company_name}>Kaydet</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
