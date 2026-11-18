import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { fetchAll } from "./fetch-all";
import { orderDateBounds } from "./order-export";
import { auditTimestamp } from "./audit-history";

type AuditEntry = Pick<Tables<"admin_audit_log">, "id" | "actor_id" | "created_at" | "action" | "before_data" | "after_data">;

function snapshotNumber(snapshot: Json | null, field: "stock" | "revision") {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const value = snapshot[field];
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function stockMovementsFromAudit(entries: AuditEntry[]) {
  return entries.flatMap((entry) => {
    const before = snapshotNumber(entry.before_data, "stock");
    const after = snapshotNumber(entry.after_data, "stock");
    if (after === null) return [];
    const opening = entry.action === "INSERT";
    if (!opening && (entry.action !== "UPDATE" || before === null || before === after)) return [];
    return [{
      id: entry.id,
      createdAt: entry.created_at,
      actorId: entry.actor_id,
      revision: snapshotNumber(entry.after_data, "revision"),
      before: opening ? null : before,
      after,
      delta: opening || before === null ? null : after - before,
    }];
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt) ||
    (b.revision ?? -1) - (a.revision ?? -1) || a.id.localeCompare(b.id));
}

export function stockMovementsQuery(productId: string, from: string, to: string) {
  return queryOptions({
    queryKey: ["admin-stock-movements", productId, from, to],
    enabled: !from || !to || from <= to,
    queryFn: async ({ signal }) => {
      const bounds = orderDateBounds(from, to);
      const entries = await fetchAll((start, end) => {
        let request = supabase.from("admin_audit_log")
          .select("id,actor_id,created_at,action,before_data,after_data")
          .eq("table_name", "products").eq("record_id", productId).in("action", ["UPDATE", "INSERT"]);
        if (bounds.from) request = request.gte("created_at", bounds.from);
        if (bounds.to) request = request.lt("created_at", bounds.to);
        return request.order("created_at", { ascending: false }).order("id").range(start, end).abortSignal(signal);
      });
      const movements = stockMovementsFromAudit(entries);
      const actorIds = [...new Set(movements.flatMap((entry) => entry.actorId ? [entry.actorId] : []))];
      const actors = new Map<string, string>();
      for (let start = 0; start < actorIds.length; start += 100) {
        const { data, error } = await supabase.from("profiles").select("id,full_name,email")
          .in("id", actorIds.slice(start, start + 100)).abortSignal(signal);
        if (error) throw new Error(error.message);
        for (const profile of data) actors.set(profile.id, profile.full_name || profile.email || profile.id);
      }
      return { movements, actors };
    },
  });
}

export function stockMovementLabel(delta: number | null) {
  if (delta === null) return "Ürün kartı açılışı";
  return delta > 0 ? "Stok artışı" : "Stok azalışı";
}

export function stockMovementActor(actorId: string | null, actors: ReadonlyMap<string, string>) {
  return actorId ? actors.get(actorId) ?? actorId : "Sistem";
}

export const stockMovementCsvHeader = ["İşlem ID", "Tarih (İstanbul)", "KM No", "Ürün", "Hareket", "Önceki stok", "Değişim", "Sonraki stok", "İşlemi yapan"];

export function stockMovementCsvRows(
  movements: ReturnType<typeof stockMovementsFromAudit>,
  product: { sku: string | null; name: string },
  actors: ReadonlyMap<string, string>,
) {
  return movements.map((entry) => [
    entry.id, auditTimestamp(entry.createdAt), product.sku, product.name, stockMovementLabel(entry.delta),
    entry.before, entry.delta, entry.after, stockMovementActor(entry.actorId, actors),
  ]);
}
