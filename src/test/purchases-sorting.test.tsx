import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/admin.alimlar";

const { from, orderHistory, filterHistory, rangeHistory, insertReceipt, receiptById } = vi.hoisted(() => ({
  from: vi.fn(), orderHistory: vi.fn(), filterHistory: vi.fn(), rangeHistory: vi.fn(),
  insertReceipt: vi.fn(), receiptById: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

const Purchases = Route.options.component!;

function renderPurchases() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(Route, "useRouteContext").mockReturnValue({ queryClient: client, adminUserId: "admin" });
  return render(<QueryClientProvider client={client}><Purchases /></QueryClientProvider>);
}

describe("purchases search and sorting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
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
      if (table === "purchases") return {
        select: (fields: string) => fields.startsWith("supplier_id,")
          ? { eq: (_column: string, id: string) => ({ maybeSingle: () => receiptById(id) }) }
          : history,
        insert: insertReceipt,
      };
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

  it("limits rendered purchase products, sorts before pagination and preserves page edits", async () => {
    const base = from.getMockImplementation()!;
    const products = Array.from({ length: 53 }, (_, index) => ({
      id: `row-${index + 1}`, sku: String(index + 1), name: `Ürün ${index + 1}`, stock: index + 1,
    }));
    from.mockImplementation((table: string) => {
      if (table !== "products") return base(table);
      const query = { order: () => query, range: async () => ({ data: products, error: null }) };
      return { select: () => query };
    });
    renderPurchases();
    const pagination = within(screen.getByRole("navigation", { name: "Alım ürünleri sayfaları" }));
    await pagination.findByText("Sayfa 1 / 3 · 53 kayıt");
    expect(within(screen.getAllByRole("table")[0]!).getAllByRole("row")).toHaveLength(26);
    fireEvent.click(pagination.getByRole("button", { name: "Sonraki" }));
    fireEvent.click(screen.getByRole("button", { name: "26 100 artır" }));
    fireEvent.change(screen.getByLabelText("Ürün sıralaması"), { target: { value: "stockDesc" } });
    expect(pagination.getByText("Sayfa 1 / 3 · 53 kayıt")).toBeInTheDocument();
    expect(within(screen.getAllByRole("table")[0]!).getAllByRole("row")[1]).toHaveTextContent("Ürün 53");
    fireEvent.click(pagination.getByRole("button", { name: "Sonraki" }));
    expect(screen.getByRole("spinbutton", { name: "26 alım adedi" })).toHaveValue(200);
  });

  it("shows a retry action when history fails and displays the real empty state after recovery", async () => {
    rangeHistory.mockResolvedValueOnce({ error: { message: "offline" } });
    renderPurchases();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Alım geçmişi yüklenemedi.");
    expect(screen.queryByText("Henüz alım yok")).not.toBeInTheDocument();
    fireEvent.click(within(alert).getByRole("button", { name: "Tekrar dene" }));
    expect(await screen.findByText("Henüz alım yok")).toBeInTheDocument();
  });

  it("reuses the receipt ID after a lost response and allows a new receipt once confirmed", async () => {
    insertReceipt.mockResolvedValueOnce({ error: { code: "", message: "Bağlantı kesildi" } })
      .mockResolvedValueOnce({ error: { code: "23505", message: "Already saved" } })
      .mockResolvedValueOnce({ error: null });
    receiptById.mockImplementation(async () => ({ data: insertReceipt.mock.calls[0]?.[0], error: null }));
    const first = renderPurchases();
    async function submit() {
      const button = await screen.findByRole("button", { name: "2 alım ekle" });
      await waitFor(() => expect(screen.getByRole("spinbutton", { name: "2 alış fiyatı" })).toBeEnabled());
      fireEvent.change(await screen.findByRole("spinbutton", { name: "2 alış fiyatı" }), { target: { value: "12.50" } });
      fireEvent.click(button);
    }
    await submit();
    await waitFor(() => expect(insertReceipt).toHaveBeenCalledTimes(1));
    first.unmount();

    renderPurchases();
    await submit();
    await waitFor(() => expect(screen.getByRole("spinbutton", { name: "2 alış fiyatı" })).toHaveValue(null));
    expect(insertReceipt.mock.calls[1]?.[0].id).toBe(insertReceipt.mock.calls[0]?.[0].id);
    expect(receiptById).toHaveBeenCalledWith(insertReceipt.mock.calls[0]?.[0].id);

    await submit();
    await waitFor(() => expect(insertReceipt).toHaveBeenCalledTimes(3));
    expect(insertReceipt.mock.calls[2]?.[0].id).not.toBe(insertReceipt.mock.calls[0]?.[0].id);
  });
});
