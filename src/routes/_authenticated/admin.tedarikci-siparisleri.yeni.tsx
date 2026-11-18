import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SupplierOrderForm } from "@/components/site/SupplierOrderForm";
import { useProcurementCommand } from "@/lib/supplier-procurement";

export const Route = createFileRoute("/_authenticated/admin/tedarikci-siparisleri/yeni")({
  validateSearch: z.object({ tedarikci: z.string().uuid().optional().catch(undefined) }),
  component: NewSupplierOrder,
});

function NewSupplierOrder() {
  const { adminUserId } = Route.useRouteContext();
  const { tedarikci } = Route.useSearch();
  const navigate = Route.useNavigate();
  const command = useProcurementCommand(adminUserId);
  return <div className="space-y-4">
    <Link to="/admin/tedarikci-siparisleri" className="text-sm font-semibold text-primary underline">Tedarikçi siparişlerine dön</Link>
    <h2 className="text-xl font-extrabold">Yeni tedarikçi siparişi</h2>
    {command.error && <p role="alert" className="rounded-md border p-3 text-sm text-destructive">{command.error}</p>}
    <SupplierOrderForm ownerId={adminUserId} initialSupplier={tedarikci ?? ""} busy={command.busy} onSave={async (payload) => {
      const saved = await command.execute("create", payload);
      if (saved) void navigate({ to: "/admin/tedarikci-siparisleri/$id", params: { id: saved.order_id }, search: {} });
    }} />
  </div>;
}
