import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "./fetch-all";

type ProductDemand = { quantity: number; stock: number | null; active: boolean | null };

export const pendingOrderDemandQuery = queryOptions({
  queryKey: ["admin-orders", "pending-demand"],
  queryFn: async ({ signal }) => {
    const items = await fetchAll((from, to) => supabase.from("order_items")
      .select("product_id,quantity,pending_order:orders!inner(status),product:products(stock,is_active)")
      .eq("pending_order.status", "pending")
      .not("product_id", "is", null)
      .order("id").range(from, to).abortSignal(signal));
    const demand = new Map<string, ProductDemand>();
    for (const item of items) {
      if (!item.product_id) continue;
      demand.set(item.product_id, {
        quantity: (demand.get(item.product_id)?.quantity ?? 0) + item.quantity,
        stock: item.product?.stock ?? null,
        active: item.product?.is_active ?? null,
      });
    }
    return demand;
  },
});

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  product: { sku: string | null } | null;
};

export function pendingOrderStock(items: OrderItem[], demand?: ReadonlyMap<string, ProductDemand>) {
  const grouped = new Map<string, OrderItem>();
  for (const item of items) {
    const key = item.product_id ?? item.id;
    const previous = grouped.get(key);
    grouped.set(key, previous ? { ...previous, quantity: previous.quantity + item.quantity } : item);
  }
  return [...grouped.values()].map((item) => {
    const pending = item.product_id ? demand?.get(item.product_id) : undefined;
    // The order and demand snapshots can be fetched at different times.
    const total = pending && pending.quantity >= item.quantity ? pending.quantity : null;
    return {
      id: item.id,
      name: item.product_name,
      sku: item.product?.sku ?? null,
      requested: item.quantity,
      stock: pending?.stock ?? null,
      others: total === null ? null : total - item.quantity,
      total,
      unavailable: item.product_id === null || pending?.active === false || pending?.active === null,
      insufficient: pending?.stock != null && pending.stock < item.quantity,
      competing: pending?.stock != null && total !== null && total > pending.stock,
    };
  });
}
