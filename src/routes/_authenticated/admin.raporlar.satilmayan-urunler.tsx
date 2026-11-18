import { createFileRoute } from "@tanstack/react-router";
import { ProductSalesReport } from "@/components/site/ProductSalesReport";

export const Route = createFileRoute("/_authenticated/admin/raporlar/satilmayan-urunler")({
  head: () => ({ meta: [{ title: "Satılmayan Ürünler — KlipsMarket" }] }),
  component: () => <ProductSalesReport key="unsold" mode="unsold" />,
});
