import { QueryClient } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { productReportQuery, supplierReportQuery } from "@/lib/admin-reports";
import { formatProcurementTotal } from "@/lib/supplier-procurement";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

it("retains exact kuruş in very large procurement documents", () => {
  expect(formatProcurementTotal(900719925474099325n)).toContain("9.007.199.254.740.993,25");
});

it("matches approved sales to products by ID and preserves products with no sales", async () => {
  const products = [{ id: "a", name: "Klips", sku: "1" }, { id: "b", name: "Klips", sku: "2" }];
  const sales = [{ product_id: "a", quantity: 5, revenue: 50 }];
  from.mockImplementation((table: string) => {
    const query = { order: () => query, range: async () => ({ data: table === "products" ? products : sales, error: null }) };
    return { select: () => query };
  });
  const rows = await new QueryClient().fetchQuery(productReportQuery);
  expect(rows).toEqual([
    { ...products[0], sold: true, quantity: 5, revenue: 50 },
    { ...products[1], sold: false, quantity: 0, revenue: 0 },
  ]);
});

it("applies inclusive purchase dates across API pages and groups by supplier ID", async () => {
  const first = { id: "historical", supplier_id: "a", supplier: { name: "Tedarikçi" }, purchase_date: "2026-11-01", quantity: 2, unit_cost: 0.35 };
  const fixtures = [...Array.from({ length: 1000 }, () => first),
    { ...first, purchase_date: "2026-11-18", quantity: 1, unit_cost: 1.05 },
    { ...first, supplier_id: "b" },
    { ...first, supplier_id: null, supplier: null },
    { ...first, id: "reversed", quantity: 600 },
  ];
  const gte = vi.fn(), lte = vi.fn();
  const range = vi.fn(async (start: number, end: number) => ({ data: fixtures.slice(start, end + 1), error: null }));
  const request = { gte, lte, order: () => request, range };
  gte.mockReturnValue(request);
  lte.mockReturnValue(request);
  const reversals = { not: () => reversals, order: () => reversals, range: async () => ({ data: [{ purchase_id: "reversed" }], error: null }) };
  from.mockImplementation((table: string) => ({ select: () => table === "procurement_purchase_links" ? reversals : request }));

  const rows = await new QueryClient().fetchQuery(supplierReportQuery("2026-11-01", "2026-11-18"));
  expect(gte.mock.calls).toEqual([["purchase_date", "2026-11-01"], ["purchase_date", "2026-11-01"]]);
  expect(lte).toHaveBeenCalledWith("purchase_date", "2026-11-18");
  expect(range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
  expect(rows).toMatchObject([
    { id: "a", count: 1001, quantity: 2001, totalCents: 70105, lastDate: "2026-11-18" },
    { id: "b", count: 1, totalCents: 70 },
    { id: null, count: 1, name: "Tedarikçi belirtilmedi" },
  ]);
});
