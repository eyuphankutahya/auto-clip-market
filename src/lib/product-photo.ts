import { supabase } from "@/integrations/supabase/client";

export async function resolveProductPhoto(source: string | null) {
  if (!source || /^https?:\/\//.test(source)) return source;
  const { data, error } = await supabase.storage.from("product-photos").createSignedUrl(source, 3600);
  if(error) throw new Error("Fotoğraf yüklenemedi");
  return data.signedUrl;
}

export async function uploadProductPhoto(file: File) {
  if(!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error("JPG, PNG veya WebP; en fazla 20 MB seçin.");
  const bitmap = await createImageBitmap(file);
  if(bitmap.width > 12000 || bitmap.height > 12000) { bitmap.close(); throw new Error("Fotoğraf boyutları en fazla 12000 piksel olabilir."); }
  const folder = crypto.randomUUID();
  const paths: string[] = [];
  try {
    const original = `${folder}/original.${file.type.split('/')[1]}`;
    const result = await supabase.storage.from("product-photos").upload(original,file,{contentType:file.type});
    if(result.error) throw result.error;
    paths.push(original);
    const variant = async (size: number, name: string) => {
      const scale = Math.min(1,size/Math.max(bitmap.width,bitmap.height));
      const canvas = document.createElement("canvas"); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale);
      const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("Fotoğraf hazırlanamadı");
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Fotoğraf hazırlanamadı")),"image/webp",0.94));
      const path=`${folder}/${name}.webp`; const result=await supabase.storage.from("product-photos").upload(path,blob,{contentType:"image/webp"});
      if(result.error) throw result.error; paths.push(path); return path;
    };
    return { image_url:await variant(1800,"detail"), image_original_url:original, image_thumbnail_url:await variant(600,"thumbnail") };
  } catch(error) { await supabase.storage.from("product-photos").remove(paths); throw error; }
  finally { bitmap.close(); }
}