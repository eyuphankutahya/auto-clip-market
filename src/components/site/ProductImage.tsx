import { useState } from "react";
import { Package, ZoomIn, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogPortal, DialogOverlay, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { resolveProductPhoto } from "@/lib/product-photo";

export function ProductImage({ src, original, name, detail = false, compact = false }: { src: string | null; original?: string | null; name: string; detail?: boolean; compact?: boolean }) {
  const [failedSource, setFailedSource] = useState<string>();
  const [open,setOpen] = useState(false);
  const { data: display, isError: displayError } = useQuery({ queryKey: ["product-photo", src], queryFn: () => resolveProductPhoto(src), enabled: Boolean(src), staleTime: 3000000 });
  const { data: large, isError: largeError } = useQuery({ queryKey: ["product-photo", original ?? src], queryFn: () => resolveProductPhoto(original ?? src), enabled: open, staleTime: 3000000 });
  const zoomSource = large ?? (largeError ? display : undefined);
  const frame = cn("relative grid w-full place-items-center overflow-hidden bg-secondary", detail || compact ? "aspect-square rounded-md border" : "aspect-[4/3]");
  const placeholder = <Package aria-hidden="true" className={cn("text-muted-foreground", compact ? "h-5 w-5" : detail ? "h-24 w-24" : "h-12 w-12")} />;
  if (!src || displayError || (display && failedSource === display)) return <div className={frame}>{placeholder}<span className="sr-only">{name} fotoğrafı görüntülenemiyor</span></div>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" aria-label={`${name} fotoğrafını büyüt`} title="Fotoğrafı büyüt" className={cn(frame, "group/image h-auto p-0 hover:bg-secondary")}>
          {display ? <img src={display} alt={name} loading={detail ? "eager" : "lazy"} onError={() => setFailedSource(display)} className="h-full w-full object-contain transition-transform duration-300 group-hover/image:scale-110 group-focus-visible/image:scale-110 motion-reduce:transition-none" /> : compact && placeholder}
          <span className={cn("absolute grid place-items-center rounded-sm border bg-background/90 text-foreground", compact ? "bottom-1 right-1 h-4 w-4" : "bottom-3 right-3 h-8 w-8")}><ZoomIn className={compact ? "h-3 w-3" : "h-4 w-4"} /></span>
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
            {zoomSource ? <img src={zoomSource} alt={name} className="mx-auto max-h-[75dvh] w-full object-contain" /> : <p className="p-8 text-muted-foreground">{largeError ? "Fotoğraf yüklenemedi." : "Fotoğraf yükleniyor…"}</p>}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
