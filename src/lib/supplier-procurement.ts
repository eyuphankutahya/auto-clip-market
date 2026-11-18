import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { fetchAll } from "./fetch-all";
import { orderDateBounds } from "./order-export";

export const procurementStatuses = {
  draft: "Taslak", ordered: "Gönderildi", partial: "Kısmi teslim",
  received: "Tam teslim", closed: "Kalanı kapatıldı", cancelled: "İptal edildi",
};
const lira = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
export function formatProcurementTotal(cents: bigint) {
  return lira.formatToParts(cents / 100n).map((part) =>
    part.type === "fraction" ? String(cents % 100n).padStart(2, "0") : part.value,
  ).join("");
}
export type ProcurementStatus = keyof typeof procurementStatuses;
export type SupplierOrder = {
  id: string; order_no: number; supplier_id: string; supplier_name: string;
  status: ProcurementStatus; expected_date: string | null; notes: string;
  created_at: string; sent_at: string | null; revision: number; ordered_qty: number; received_qty: number;
};
export type SupplierOrderLine = {
  id: string; order_id: string; product_id: string; sku: string | null; product_name: string;
  supplier_code: string | null; ordered_qty: number; received_qty: number; expected_cost: number | null; current_stock: number;
};
export type GoodsReceipt = {
  id: string; order_id: string; receipt_no: number; document_no: string; document_date: string;
  received_date: string; created_at: string; reversed_at: string | null;
};
type ReceiptLine = { id: string; receipt_id: string; order_line_id: string; quantity: number; unit_cost: number; purchase_id: string };
type ReceiptOverview = GoodsReceipt & { supplier_id: string; supplier_name: string; quantity: number; total_cents: string };
type OrderEvent = { id: string; order_id: string; action: ProcurementAction; actor_id: string; reason: string | null; created_at: string; details: Json };
export type ProcurementPurchaseLink = { purchase_id: string; order_id: string; receipt_id: string; receipt_no: number; reversed_at: string | null };
type MovementLink = { product_id: string; product_revision: number; order_id: string; receipt_id: string; receipt_no: number; reversal_id: string | null };
type ReadTable<T> = { Row: T; Insert: never; Update: never; Relationships: [] };
type ProcurementAction = "create" | "edit" | "send" | "cancel" | "close" | "reopen" | "increase" | "receive" | "reverse";

// Local contract for the Lovable-managed schema in docs/supplier-procurement-schema.sql.
type ProcurementDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      supplier_order_overview: ReadTable<SupplierOrder>;
      supplier_order_line_progress: ReadTable<SupplierOrderLine>;
      goods_receipts: ReadTable<GoodsReceipt>;
      goods_receipt_lines: ReadTable<ReceiptLine>;
      supplier_order_events: ReadTable<OrderEvent>;
      procurement_purchase_links: ReadTable<ProcurementPurchaseLink>;
      procurement_movement_links: ReadTable<MovementLink>;
      procurement_receipt_overview: ReadTable<ReceiptOverview>;
    };
    Functions: Database["public"]["Functions"] & {
      supplier_order_command: { Args: { _action: ProcurementAction; _payload: Json; _request_key: string }; Returns: Json };
    };
  };
};
const db = supabase as unknown as SupabaseClient<ProcurementDatabase>;
const resultSchema = z.object({ order_id: z.string().uuid(), receipt_id: z.string().uuid().optional() });
const missingSchema = (code: string) => ["42P01", "42883", "PGRST202", "PGRST205"].includes(code);
const procurementUnavailable = "Tedarikçi siparişleri veritabanı bu ortamda henüz devreye alınmamış.";

export const procurementSuppliersQuery = queryOptions({
  queryKey: ["procurement", "suppliers"],
  queryFn: () => fetchAll((from, to) => supabase.from("suppliers").select("id,name").order("name").order("id").range(from, to)),
});

export function procurementProductsQuery(supplierId: string) {
  return queryOptions({
    queryKey: ["procurement", "products", supplierId],
    enabled: Boolean(supplierId),
    queryFn: async () => {
      const links = await fetchAll((from, to) => supabase.from("product_supplier_codes")
        .select("product_id,code,product:products!inner(id,sku,name,stock)")
        .eq("supplier_id", supplierId).eq("product.is_active", true).order("id").range(from, to));
      const products = new Map<string, { id: string; sku: string | null; name: string; stock: number; codes: string[] }>();
      for (const link of links) {
        const product = products.get(link.product_id) ?? { ...link.product, codes: [] };
        if (link.code && !product.codes.includes(link.code)) product.codes.push(link.code);
        products.set(link.product_id, product);
      }
      return [...products.values()];
    },
  });
}

export type ProcurementFilters = { supplier: string; status: ProcurementStatus | ""; number: string; from: string; to: string };
export function procurementListQuery(filters: ProcurementFilters, page: number, pageSize: number) {
  return queryOptions({
    queryKey: ["procurement", "list", filters, page],
    enabled: !filters.from || !filters.to || filters.from <= filters.to,
    queryFn: async () => {
      const bounds = orderDateBounds(filters.from, filters.to);
      let request = db.from("supplier_order_overview").select("*", { count: "exact" });
      if (filters.supplier) request = request.eq("supplier_id", filters.supplier);
      if (filters.status) request = request.eq("status", filters.status);
      if (filters.number) request = request.eq("order_no", /^\d{1,15}$/.test(filters.number) ? Number(filters.number) : -1);
      if (bounds.from) request = request.gte("created_at", bounds.from);
      if (bounds.to) request = request.lt("created_at", bounds.to);
      const { data, error, count } = await request.order("order_no", { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw new Error(missingSchema(error.code) ? procurementUnavailable : error.message);
      return { orders: data, total: count ?? 0 };
    },
  });
}

export function procurementOrderQuery(id: string) {
  return queryOptions({
    queryKey: ["procurement", "order", id],
    queryFn: async () => {
      const { data: order, error } = await db.from("supplier_order_overview").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(missingSchema(error.code) ? procurementUnavailable : error.message);
      if (!order) return null;
      const [lines, receipts, events] = await Promise.all([
        fetchAll((a, b) => db.from("supplier_order_line_progress").select("*").eq("order_id", id).order("id").range(a, b)),
        fetchAll((a, b) => db.from("goods_receipts").select("*").eq("order_id", id).order("receipt_no", { ascending: false }).range(a, b)),
        fetchAll((a, b) => db.from("supplier_order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }).order("id").range(a, b)),
      ]);
      const actorIds = [...new Set(events.map((event) => event.actor_id))];
      const actors = new Map<string, string>();
      for (let i = 0; i < actorIds.length; i += 100) {
        const { data, error } = await supabase.from("profiles").select("id,full_name,email").in("id", actorIds.slice(i, i + 100));
        if (error) throw new Error(error.message);
        for (const profile of data) actors.set(profile.id, profile.full_name || profile.email || profile.id);
      }
      return { order, lines, receipts, events, actors };
    },
  });
}

export function procurementReceiptLinesQuery(receiptId: string) {
  return queryOptions({
    queryKey: ["procurement", "receipt", receiptId],
    queryFn: () => fetchAll((a, b) => db.from("goods_receipt_lines").select("*").eq("receipt_id", receiptId).order("id").range(a, b)),
  });
}

export function procurementReceiptListQuery(filters: { supplier: string; document: string; state: string; from: string; to: string }, page: number, pageSize: number) {
  return queryOptions({
    queryKey: ["procurement", "receipt-list", filters, page],
    enabled: !filters.from || !filters.to || filters.from <= filters.to,
    queryFn: async () => {
      let request = db.from("procurement_receipt_overview").select("*", { count: "exact" });
      if (filters.supplier) request = request.eq("supplier_id", filters.supplier);
      if (filters.document) request = request.ilike("document_no", `%${filters.document.replace(/[\\%_]/g, "\\$&")}%`);
      if (filters.state === "active") request = request.is("reversed_at", null);
      if (filters.state === "reversed") request = request.not("reversed_at", "is", null);
      if (filters.from) request = request.gte("received_date", filters.from);
      if (filters.to) request = request.lte("received_date", filters.to);
      const { data, count, error } = await request.order("receipt_no", { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw new Error(missingSchema(error.code) ? procurementUnavailable : error.message);
      return { receipts: data, total: count ?? 0 };
    },
  });
}

// Existing screens also run before the procurement schema is deployed.
export async function procurementPurchaseLinks(purchaseIds?: string[]) {
  if (purchaseIds && purchaseIds.length === 0) return [];
  return fetchAll(async (a, b) => {
    let request = db.from("procurement_purchase_links").select("*");
    request = purchaseIds ? request.in("purchase_id", purchaseIds) : request.not("reversed_at", "is", null);
    const result = await request.order("purchase_id").range(a, b);
    if (result.error && missingSchema(result.error.code)) return { data: [], error: null };
    return result;
  });
}

export function procurementMovementLinksQuery(productId: string) {
  return queryOptions({
    queryKey: ["procurement", "movement", productId],
    queryFn: () => fetchAll(async (a, b) => {
      const result = await db.from("procurement_movement_links").select("*").eq("product_id", productId)
        .order("product_revision").range(a, b);
      if (result.error && missingSchema(result.error.code)) return { data: [], error: null };
      return result;
    }),
  });
}

export function useProcurementCommand(ownerId: string) {
  const client = useQueryClient();
  const running = useRef(false);
  const retryIds = useRef(new Map<string, string>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function execute(action: ProcurementAction, payload: Json) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    const key = `klipsmarket:procurement:${ownerId}:${action}:${JSON.stringify(payload)}`;
    try {
      let id = retryIds.current.get(key);
      try { id ??= sessionStorage.getItem(key) ?? undefined; } catch { /* Keep the key in memory. */ }
      id ??= crypto.randomUUID();
      retryIds.current.set(key, id);
      try { sessionStorage.setItem(key, id); } catch { /* Keep the key in memory. */ }
      const result = await db.rpc("supplier_order_command", { _action: action, _payload: payload, _request_key: id });
      if (result.error) throw new Error(missingSchema(result.error.code) ? procurementUnavailable : result.error.message);
      const saved = resultSchema.parse(result.data);
      retryIds.current.delete(key);
      try { sessionStorage.removeItem(key); } catch { /* Already recorded. */ }
      await client.invalidateQueries();
      return saved;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "İşlem tamamlanamadı.");
      return undefined;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { execute, busy, error, clearError: () => setError("") };
}
