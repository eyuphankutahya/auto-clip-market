import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/admin.alimlar";

const { from, orderHistory, filterHistory, rangeHistory } = vi.hoisted(() => ({
  from: vi.fn(), orderHistory: vi.fn(), filterHistory: vi.fn(), rangeHistory: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

const Purchases = Route.options.component!;

function renderPurchases() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Purchases /></QueryClientProvider>);
}

describe("purchases search and sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const products = [
      { id: "p1", sku: "2", name: "Tampon klipsi", stock: 70 },
      { id: "p2", sku: "10", name: "Çamurluk klipsi", stock: 5 },
      { id: "p3", sku: "20", name: "Kapı klipsi", stock: 30 },
    ];
    const codes = [
      { product_id: "p1", supplier_id: "ata", code: "AT-70" },
      { product_id: "p2", supplier_id: "ata", code: "AT-05" },
      { product_id: "p2", supplier_id: "other", code: "BR-845" },
    ];
    const history = { order: orderHistory, eq: filterHistory, range: rangeHistory };
    orderHistory.mockReturnValue(history);
    filterHistory.mockReturnValue(history);
    rangeHistory.mockResolvedValue({ data: [], count: 100, error: null });
    from.mockImplementation((table: string) => {
      if (table === "purchases") return { select: () => history };
      if (table === "suppliers") return { select: () => ({ order: async () => ({ data: [{ id: "ata", name: "ATA" }] }) }) };
      const page = { order: () => page, range: async () => ({ data: table === "products" ? products : codes, error: null }) };
      return { select: () => page };
    });
  });

  it("sorts only the selected supplier's products by stock and preserves the draft quantity", async () => {
    renderPurchases();
    fireEvent.click(await screen.findByRole("button", { name: "ATA" }));
    fireEvent.click(screen.getByRole("button", { name: "2 100 artır" }));
    const sort = screen.getByLabelText("Ürün sıralaması");
    const rows = () => within(screen.getAllByRole("table")[0]!).getAllByRole("row");

    fireEvent.change(sort, { target: { value: "stockAsc" } });
    expect(rows()[1]).toHaveTextContent("Çamurluk klipsi");
    expect(rows()).toHaveLength(3);
    fireEvent.change(sort, { target: { value: "stockDesc" } });
    expect(rows()[1]).toHaveTextContent("Tampon klipsi");
    expect(screen.getByRole("spinbutton", { name: "2 alım adedi" })).toHaveValue(200);
  });

  it("searches product names, KM numbers and codes within the selected supplier", async () => {
    renderPurchases();
    const supplier = await screen.findByRole("button", { name: "ATA" });
    const search = screen.getByRole("searchbox", { name: "Ürün ara" });
    const rows = () => within(screen.getAllByRole("table")[0]!).getAllByRole("row");

    fireEvent.change(search, { target: { value: "camurluk" } });
    expect(rows()).toHaveLength(2);
    expect(rows()[1]).toHaveTextContent("Çamurluk klipsi");
    fireEvent.change(search, { target: { value: "10" } });
    expect(rows()).toHaveLength(2);
    expect(rows()[1]).toHaveTextContent("Çamurluk klipsi");
    fireEvent.change(search, { target: { value: "br845" } });
    expect(rows()).toHaveLength(2);
    fireEvent.click(supplier);
    expect(screen.getByText("Aramanızla eşleşen ürün bulunamadı.")).toBeVisible();
    fireEvent.change(search, { target: { value: "at05" } });
    expect(rows()[1]).toHaveTextContent("Çamurluk klipsi");
  });

  it("sorts purchase history before pagination and returns to the first page", async () => {
    renderPurchases();
    fireEvent.click(await screen.findByRole("button", { name: "ATA" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sonraki" }));
    await waitFor(() => expect(rangeHistory).toHaveBeenLastCalledWith(50, 99));

    vi.clearAllMocks();
    fireEvent.change(screen.getByLabelText("Geçmiş sıralaması"), { target: { value: "dateAsc" } });
    await waitFor(() => expect(rangeHistory).toHaveBeenLastCalledWith(0, 49));
    expect(filterHistory).toHaveBeenCalledWith("supplier_id", "ata");
    expect(orderHistory).toHaveBeenNthCalledWith(1, "purchase_date", { ascending: true });
    expect(orderHistory.mock.invocationCallOrder[0]).toBeLessThan(rangeHistory.mock.invocationCallOrder[0]!);
  });
});
