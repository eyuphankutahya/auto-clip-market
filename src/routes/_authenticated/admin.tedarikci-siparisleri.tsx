import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/tedarikci-siparisleri")({
  head: () => ({ meta: [{ title: "Tedarikçi Siparişleri — KlipsMarket" }] }),
  component: Outlet,
});
