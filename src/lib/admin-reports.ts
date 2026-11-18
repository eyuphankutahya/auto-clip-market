import { queryOptions } from "@tanstack/react-query";
import { Boxes, PackageMinus, TrendingUp, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { procurementPurchaseLinks } from "./supplier-procurement";

export const reportPages = [
  { to: "/admin/raporlar/satilan-urunler", label: "Satılan ürünler", description: "Onaylanan ve kargolanan siparişlerdeki ürün adetleri ve satış cirosu.", icon: TrendingUp },
  { to: "/admin/raporlar/satilmayan-urunler", label: "Satılmayan ürünler", description: "Kayıtlı satışı olmayan ürünlerin mevcut stok ve satış durumları.", icon: PackageMinus },
  { to: "/admin/raporlar/tedarikci-alimlari", label: "Tedarikçi bazlı alımlar", description: "Tedarikçi başına alım kaydı, toplam adet ve alış maliyeti.", icon: Truck },
  { to: "/admin/raporlar/stok-durumu", label: "Stok durumu", description: "Mevcut stok, stok sınırları ve satış durumu.", icon: Boxes },
] as const;

function fetchStockProducts() {
  return fetchAll((from, to) => supabase.from("products").select("id,sku,name,stock,min_stock,max_stock,is_active").order("id").range(from, to));
}

export const stockReportQuery = queryOptions({
  queryKey: ["admin-stock-report"],
  queryFn: fetchStockProducts,
});

export const productReportQuery = queryOptions({
  queryKey: ["admin-product-reports"],
  queryFn: async () => {
    const [products, sales] = await Promise.all([
      fetchStockProducts(),
      fetchAll((from, to) => supabase.from("product_sales").select("product_id,quantity,revenue").order("product_id").range(from, to)),
    ]);
    const salesByProduct = new Map(sales.flatMap((sale) => sale.product_id
      ? [[sale.product_id, { quantity: Number(sale.quantity ?? 0), revenue: Number(sale.revenue ?? 0) }] as const]
      : []));
    return products.map((product) => {
      const sale = salesByProduct.get(product.id);
      return { ...product, sold: sale !== undefined, quantity: sale?.quantity ?? 0, revenue: sale?.revenue ?? 0 };
    });
  },
});

export function supplierReportQuery(from: string, to: string) {
  return queryOptions({
    queryKey: ["admin-supplier-report", from, to],
    enabled: !from || !to || from <= to,
    queryFn: async () => {
      const [purchases, reversed] = await Promise.all([fetchAll((start, end) => {
        let query = supabase.from("purchases").select("id,supplier_id,purchase_date,quantity,unit_cost,supplier:suppliers(name)");
        if (from) query = query.gte("purchase_date", from);
        if (to) query = query.lte("purchase_date", to);
        return query.order("id").range(start, end);
      }), procurementPurchaseLinks()]);

      const excluded = new Set(reversed.map((link) => link.purchase_id));
      const groups = new Map<string | null, { id: string | null; name: string; count: number; quantity: number; totalCents: number; lastDate: string }>();
      for (const purchase of purchases) {
        if (excluded.has(purchase.id)) continue;
        const group = groups.get(purchase.supplier_id) ?? {
          id: purchase.supplier_id, name: purchase.supplier?.name ?? "Tedarikçi belirtilmedi", count: 0, quantity: 0, totalCents: 0, lastDate: purchase.purchase_date,
        };
        group.count++;
        group.quantity += purchase.quantity;
        group.totalCents += Math.round(Number(purchase.unit_cost) * 100) * purchase.quantity;
        if (purchase.purchase_date > group.lastDate) group.lastDate = purchase.purchase_date;
        groups.set(group.id, group);
      }

      return [...groups.values()];
    },
  });
}
