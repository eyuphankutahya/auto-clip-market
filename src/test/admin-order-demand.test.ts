import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { pendingOrderDemandQuery, pendingOrderStock } from "@/lib/admin-order-demand";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

it("aggregates pending demand across API pages and requests the pending state at the server", async () => {
  const item = { product_id: "a", quantity: 2, product: { stock: 1000, is_active: true } };
  const items = [...Array.from({ length: 1000 }, () => item), { ...item, quantity: 25 }];
  const range = vi.fn((start: number, end: number) => ({
    abortSignal: async () => ({ data: items.slice(start, end + 1), error: null }),
  }));
  const request = { eq: vi.fn(() => request), not: () => request, order: () => request, range };
  from.mockReturnValue({ select: () => request });

  const demand = await new QueryClient().fetchQuery(pendingOrderDemandQuery);
  expect(demand.get("a")).toEqual({ quantity: 2025, stock: 1000, active: true });
  expect(request.eq).toHaveBeenCalledWith("pending_order.status", "pending");
  expect(range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
});

it("separates the order from other demand and handles duplicate or unavailable items", () => {
  const item = { id: "i1", product_id: "a", product_name: "Kapı klipsi", quantity: 40, product: { sku: "14" } };
  const items = [
    item,
    { ...item, id: "i2", quantity: 20 },
    { ...item, id: "i3", product_id: "b", quantity: 15 },
    { ...item, id: "i4", product_id: null, product: null },
    { ...item, id: "i5", product_id: "c" },
  ];
  const demand = new Map([
    ["a", { quantity: 130, stock: 100, active: true }],
    ["b", { quantity: 15, stock: 10, active: true }],
    ["c", { quantity: 20, stock: 200, active: false }],
  ]);
  expect(pendingOrderStock(items, demand)).toMatchObject([
    { requested: 60, total: 130, others: 70, stock: 100, insufficient: false, competing: true },
    { requested: 15, stock: 10, insufficient: true },
    { unavailable: true, total: null, stock: null },
    { unavailable: true, total: null, others: null },
  ]);
});
