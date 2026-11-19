import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fetchAll } from "./fetch-all";
import { mergePurchaseLines, type PurchaseLine } from "./purchase-list";

type DraftRow = Database["public"]["Tables"]["purchase_draft_lines"]["Insert"];

export type PurchaseDraftChange = { upsert: PurchaseLine[] } | { remove: string };

export function draftOptions(ownerId: string) {
  return queryOptions({
    queryKey: ["admin-purchase-draft", ownerId],
    queryFn: async (): Promise<PurchaseLine[]> => {
      const rows = await fetchAll((from, to) =>
        supabase.from("purchase_draft_lines").select("*").eq("owner_id", ownerId)
          .order("product_id").range(from, to),
      );
      return rows.map((row) => ({
        productId: row.product_id,
        sku: row.sku,
        name: row.product_name,
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        codes: row.supplier_codes,
        quantity: row.quantity,
      }));
    },
  });
}

export function usePurchaseDraft(ownerId: string) {
  const client = useQueryClient();
  const options = draftOptions(ownerId);
  const query = useQuery(options);
  const save = useMutation({
    mutationFn: async (change: PurchaseDraftChange) => {
      const table = supabase.from("purchase_draft_lines");
      const { error } = "remove" in change
        ? await table.delete().eq("owner_id", ownerId).eq("product_id", change.remove)
        : await table.upsert(change.upsert.map((line): DraftRow => ({
            owner_id: ownerId,
            product_id: line.productId,
            sku: line.sku,
            product_name: line.name,
            supplier_id: line.supplierId,
            supplier_name: line.supplierName,
            supplier_codes: line.codes,
            quantity: line.quantity,
          })), { onConflict: "owner_id,product_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: async (_, change) => {
      await client.cancelQueries({ queryKey: options.queryKey, exact: true });
      client.setQueryData(options.queryKey, (lines = []) =>
        "remove" in change
          ? lines.filter((line) => line.productId !== change.remove)
          : mergePurchaseLines(lines, change.upsert),
      );
      void client.invalidateQueries({ queryKey: options.queryKey, exact: true, refetchType: "inactive" });
    },
  });

  return { query, save };
}
