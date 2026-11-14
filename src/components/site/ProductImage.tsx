import { useState } from "react";
import { Package, ZoomIn, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { resolveProductPhoto } from "@/lib/product-photo";

export function ProductImage({ src, original, name, detail = false }: { src: string | null; original?: string | null; name: string; detail?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [open,setOpen] = useState(false);
  const {data:display}=useQuery({queryKey:["product-photo",src],queryFn:()=>resolveProductPhoto(src),staleTime:3000000});
  const {data:large}=useQuery({queryKey:["product-photo",original ?? src],queryFn:()=>resolveProductPhoto(original ?? src),enabled:open,staleTime:3000000});
  const frame = cn("relative grid w-full place-items-center overflow-hidden bg-secondary", detail ? "aspect-square rounded-md border" : "aspect-[4/3]");
  if (!src || failed) return <div className={frame}><Package className={cn("text-muted-foreground", detail ? "h-24 w-24" : "h-12 w-12")} /><span className="sr-only">{name} — fotoğraf yok</span></div>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" aria-label={`${name} fotoğrafını büyüt`} title="Fotoğrafı büyüt" className={cn(frame, "group/image h-auto p-0 hover:bg-secondary")}>
          {display && <img src={display} alt={name} loading={detail ? "eager" : "lazy"} onError={() => setFailed(true)} className="h-full w-full object-contain transition-transform duration-300 group-hover/image:scale-110 group-focus-visible/image:scale-110 motion-reduce:transition-none" />}
          <span className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-sm border bg-background/90 text-foreground"><ZoomIn className="h-4 w-4" /></span>
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content aria-describedby={undefined} className="fixed left-1/2 top-1/2 z-50 flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md border bg-background shadow-lg focus:outline-none">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3">
            <DialogTitle className="min-w-0 break-words text-base leading-snug">{name}</DialogTitle>
            <DialogClose asChild><Button variant="ghost" size="icon" aria-label="Fotoğrafı kapat" title="Kapat" className="shrink-0"><X /></Button></DialogClose>
          </div>
          <div className="min-h-0 overflow-auto p-2 sm:p-4">
            {large ? <img src={large} alt={name} className="mx-auto max-h-[75dvh] w-full object-contain" /> : <p className="p-8 text-muted-foreground">Fotoğraf yükleniyor…</p>}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}