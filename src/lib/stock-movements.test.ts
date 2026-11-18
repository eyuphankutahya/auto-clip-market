import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { stockMovementCsvRows, stockMovementsFromAudit, stockMovementsQuery } from "./stock-movements";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

const created_at = "2026-11-18T08:00:00Z";
const update = { actor_id: "u", action: "UPDATE", created_at };

it("keeps observed stock changes and openings without manufacturing a stock change for other edits", () => {
  const rows = stockMovementsFromAudit([
    { ...update, id: "b", before_data: { stock: 100 }, after_data: { stock: 110, revision: 2 } },
    { ...update, id: "a", before_data: { stock: 110 }, after_data: { stock: 90, revision: 3 } },
    { ...update, id: "metadata", before_data: { stock: 90 }, after_data: { stock: 90, price: 3 } },
    { ...update, id: "incomplete", before_data: null, after_data: { stock: 90 } },
    { ...update, id: "delete", action: "DELETE", before_data: { stock: 90 }, after_data: null },
    { ...update, id: "opening", action: "INSERT", before_data: null, after_data: { stock: 100, revision: 0 }, created_at: "2026-11-17T08:00:00Z" },
  ]);
  expect(rows.map(({ id, before, after, delta }) => [id, before, after, delta])).toEqual([
    ["a", 110, 90, -20], ["b", 100, 110, 10], ["opening", null, 100, null],
  ]);
  expect(stockMovementCsvRows(rows, { sku: "14", name: "Klips" }, new Map([["u", "Yönetici"]]))[0])
    .toEqual(["a", expect.any(String), "14", "Klips", "Stok azalışı", 110, -20, 90, "Yönetici"]);
});

it("loads movements only for the selected product and an inclusive Istanbul date range across API pages", async () => {
  const unchanged = { ...update, id: "metadata", before_data: { stock: 2 }, after_data: { stock: 2 } };
  const entries = [
    ...Array.from({ length: 1000 }, () => unchanged),
    { ...update, id: "last", before_data: { stock: 2 }, after_data: { stock: 0 } },
  ];
  const range = vi.fn((start: number, end: number) => ({
    abortSignal: async () => ({ data: entries.slice(start, end + 1), error: null }),
  }));
  const request = {
    eq: vi.fn(() => request), in: vi.fn(() => request), gte: vi.fn(() => request),
    lt: vi.fn(() => request), order: () => request, range,
  };
  const profiles = vi.fn(() => ({ abortSignal: async () => ({ data: [{ id: "u", full_name: "Yönetici", email: "test@example.test" }], error: null }) }));
  from.mockImplementation((table: string) => ({ select: () => table === "admin_audit_log" ? request : { in: profiles } }));

  const result = await new QueryClient().fetchQuery(stockMovementsQuery("product-a", "2026-11-18", "2026-11-18"));
  expect(result.movements).toMatchObject([{ id: "last", before: 2, after: 0, delta: -2 }]);
  expect(result.actors.get("u")).toBe("Yönetici");
  expect(profiles).toHaveBeenCalledWith("id", ["u"]);
  expect(request.eq).toHaveBeenCalledWith("table_name", "products");
  expect(request.eq).toHaveBeenCalledWith("record_id", "product-a");
  expect(request.gte).toHaveBeenCalledWith("created_at", "2026-11-17T21:00:00.000Z");
  expect(request.lt).toHaveBeenCalledWith("created_at", "2026-11-18T21:00:00.000Z");
  expect(range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
});
