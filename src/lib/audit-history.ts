import type { Tables } from "@/integrations/supabase/types";
import { auditTables } from "./admin-rules";
import { orderDateBounds } from "./order-export";

export const auditActions: Record<string, string> = { INSERT: "Eklendi", UPDATE: "Değiştirildi", DELETE: "Silindi" };
export type AuditFilters = { table: string; action: string; actor: string; from: string; to: string; search: string };
export function auditFilterValues(filters: AuditFilters) {
  if (filters.from && filters.to && filters.from > filters.to) throw new Error("Bitiş tarihi başlangıçtan önce olamaz.");
  return { ...filters, ...orderDateBounds(filters.from, filters.to), search: filters.search.trim().replace(/[%_]/g, "\\$&") };
}
export const auditTimestamp = (date: string) => new Date(date).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
export const auditCsvHeader = ["İşlem No", "Tarih", "Kullanıcı", "Kullanıcı ID", "Alan", "Kayıt", "İşlem", "Önce", "Sonra"];
export function auditCsvRow(row: Tables<"admin_audit_log">, profiles: Map<string, string>) {
  return [row.id, auditTimestamp(row.created_at), row.actor_id ? profiles.get(row.actor_id) ?? "Silinmiş kullanıcı" : "Sistem",
    row.actor_id, auditTables[row.table_name] ?? row.table_name, row.record_label, auditActions[row.action] ?? row.action,
    row.before_data === null ? "" : JSON.stringify(row.before_data), row.after_data === null ? "" : JSON.stringify(row.after_data)];
}