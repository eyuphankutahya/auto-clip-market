import { Button } from "@/components/ui/button";

export const PAGE_SIZE = 50;

/** Simple previous/next pager for server-side paginated lists. */
export function Pager({ page, total, pageSize = PAGE_SIZE, onChange }: { page: number; total: number; pageSize?: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <span className="text-muted-foreground">Sayfa {page + 1} / {pages} · {total} kayıt</span>
      <Button size="sm" variant="outline" disabled={page === 0} onClick={() => onChange(page - 1)}>Önceki</Button>
      <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>Sonraki</Button>
    </div>
  );
}
