import { createFileRoute } from "@tanstack/react-router";
import { ProductSalesReport } from "@/components/site/ProductSalesReport";

export const Route = createFileRoute("/_authenticated/admin/raporlar/satilan-urunler")({
  head: () => ({ meta: [{ title: "Satılan Ürünler — KlipsMarket" }] }),
  component: () => <ProductSalesReport key="sold" mode="sold" />,
});
