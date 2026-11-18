import { supabase } from "@/integrations/supabase/client";

export async function updateOrderStatuses(orders: { id: string; status: string }[], target: string) {
  if (target === "approved") {
    const { data, error } = await supabase.from("orders")
      .select("id,order_no,items:order_items(product_id,product:products(is_active))")
      .in("id", orders.map((order) => order.id));
    if (error) throw new Error(error.message);
    if (data.length !== orders.length) throw new Error("Bir sipariş bulunamadı. Listeyi yenileyin.");
    const invalid = data.find((order) => !order.items.length || order.items.some((item) => !item.product?.is_active));
    if (invalid) throw new Error(`Sipariş #${invalid.order_no} onaylanamadı. Ürünlerden biri silinmiş veya satışa kapalı.`);
  }

  const { data, error } = await supabase.rpc("admin_bulk_orders", {
    _items: orders.map(({ id, status }) => ({ id, status })),
    _target: target,
  });
  if (error) throw new Error(error.message);
  return data;
}
