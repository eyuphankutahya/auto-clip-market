import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadProductPhoto } from "@/lib/product-photo";

export function ProductPhotoUpload({onChange}: {onChange:(photos:{image_url:string;image_original_url:string;image_thumbnail_url:string})=>void}) {
  const [busy,setBusy]=useState(false);
  return <div className="space-y-2"><Button asChild variant="outline" disabled={busy}><label className={busy ? "pointer-events-none" : ""}>{busy ? <Loader2 className="animate-spin"/>:<Upload/>}{busy?"Fotoğraf hazırlanıyor ve yükleniyor…":"Fotoğraf yükle"}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setBusy(true);try{onChange(await uploadProductPhoto(file));toast.success("Fotoğraf yüklendi; ürünü kaydedin.");}catch(error){toast.error(error instanceof Error?error.message:"Fotoğraf yüklenemedi");}finally{setBusy(false);e.target.value="";}}}/></label></Button></div>;
}