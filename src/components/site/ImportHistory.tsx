import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function ImportHistory() {
  const qc=useQueryClient(); const [busy,setBusy]=useState("");
  const {data,error}=useQuery({queryKey:["import-history"],queryFn:async()=>{const {data,error}=await supabase.from("import_batches").select("*,items:import_items(*)").order("created_at",{ascending:false}).limit(20);if(error)throw error;return data;}});
  return <section className="mb-8 space-y-3"><h2 className="font-bold">Aktarım geçmişi</h2>{error && <p className="text-destructive">Geçmiş yüklenemedi.</p>}{data?.map(batch=><details key={batch.id} className="border-b pb-3"><summary className="cursor-pointer text-sm"><b>{batch.filename}</b> · {new Date(batch.created_at).toLocaleString("tr-TR")} · {batch.items.length} ürün{batch.rolled_back_at ? " · Geri alındı" : ""}</summary><p className="mt-2 break-all text-xs text-muted-foreground">İşlemi yapan: {batch.created_by}</p><div className="my-2 max-h-48 overflow-auto text-xs">{batch.items.map(item=><p key={item.id}>{item.product_id}: {JSON.stringify(item.previous_data)} → {JSON.stringify(item.applied_data)}{item.was_created?" · Yeni kart (geri almada kart korunur)":""}</p>)}</div>{!batch.rolled_back_at && <Button variant="outline" size="sm" disabled={!!busy} onClick={async()=>{if(!confirm("Aktarım geri alınsın mı? Sonradan değişen ürün varsa işlem durdurulur. Yeni kartlar silinmez; stok ve fiyatları sıfırlanır."))return;setBusy(batch.id);try{const {error}=await supabase.rpc("rollback_import",{_batch_id:batch.id});if(error)throw error;toast.success("Aktarım geri alındı");await qc.invalidateQueries();}catch(error){toast.error(error instanceof Error?error.message:"Geri alma uygulanamadı");}finally{setBusy("");}}}><Undo2/>Geri al</Button>}</details>)}{data?.length===0 && <p className="text-sm text-muted-foreground">Henüz aktarım yok.</p>}</section>;
}