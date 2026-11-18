import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateOrderStatuses } from "./admin-order-actions";

const { readOrders, rpc } = vi.hoisted(() => ({ readOrders: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ in: readOrders }) }), rpc },
}));

describe("admin order status updates", () => {
  const order = { id: "order-1", status: "pending" };
  beforeEach(() => {
    readOrders.mockReset();
    rpc.mockReset().mockResolvedValue({ data: 1, error: null });
  });

  it.each([null, { is_active: false }])("blocks approval of unavailable products (%j)", async (product) => {
    readOrders.mockResolvedValue({ data: [{ ...order, order_no: 10, items: [{ product }] }], error: null });
    await expect(updateOrderStatuses([order], "approved")).rejects.toThrow("Sipariş #10 onaylanamadı");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("uses the transactional RPC and sends the expected status on single approval", async () => {
    readOrders.mockResolvedValue({ data: [{ ...order, order_no: 10, items: [{ product: { is_active: true } }] }], error: null });
    await expect(updateOrderStatuses([order], "approved")).resolves.toBe(1);
    expect(rpc).toHaveBeenCalledWith("admin_bulk_orders", { _items: [order], _target: "approved" });
  });

  it("can cancel a pending order even if its product was deleted", async () => {
    await expect(updateOrderStatuses([order], "cancelled")).resolves.toBe(1);
    expect(readOrders).not.toHaveBeenCalled();
  });
});
