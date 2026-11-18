import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/admin.eksik-stok";

const database = vi.hoisted(() => ({
  rows: new Map<string, { owner_id: string; product_id: string }>(),
  rejectWrite: false,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_column: string, owner: string) => ({
          order: () => ({
            range: async () => ({
              data: [...database.rows.values()].filter((row) => row.owner_id === owner),
              error: null,
            }),
          }),
        }),
      }),
      upsert: async (rows: Array<{ owner_id: string; product_id: string }>) => {
        if (database.rejectWrite) return { error: { message: "Write failed" } };
        for (const row of rows) database.rows.set(`${row.owner_id}/${row.product_id}`, row);
        return { error: null };
      },
      delete: () => ({
        eq: (_column: string, owner: string) => ({
          eq: async (_column: string, product: string) => {
            database.rows.delete(`${owner}/${product}`);
            return { error: null };
          },
        }),
      }),
    }),
  },
}));

vi.mock("@/components/site/ProductImage", () => ({ ProductImage: () => null }));
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const query = await importOriginal<typeof import("@tanstack/react-query")>();
  const supplier = { id: "ata", name: "ATA" };
  const otherSupplier = { id: "star", name: "STAR" };
  const products = Array.from({ length: 52 }, (_, index) => ({
    id: `product-${index + 1}`,
    sku: String(index + 1),
    name: `Klips ${index + 1}`,
    stock: 51 - index,
    min_stock: 100,
    max_stock: null,
    image_url: null,
    image_thumbnail_url: null,
    image_original_url: null,
    suppliers: index === 0 ? [] : [{ supplier_id: supplier.id, name: supplier.name, code: null }],
  }));
  const purchaseProducts = products.map((product) => product.id !== "product-2" ? product : {
    ...product,
    suppliers: [...product.suppliers, { supplier_id: otherSupplier.id, name: otherSupplier.name, code: "ST-2" }],
  });
  return { ...query, useSuspenseQuery: () => ({ data: { products, purchaseProducts, suppliers: [supplier, otherSupplier] } }) };
});

beforeEach(() => {
  database.rows.clear();
  database.rejectWrite = false;
});

function openShortages(adminUserId = "admin-a") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(Route, "useRouteContext").mockReturnValue({ queryClient, adminUserId });
  const Shortages = Route.options.component!;
  return render(<QueryClientProvider client={queryClient}><Shortages /></QueryClientProvider>);
}

it("sorts the entire filtered shortage list, resets the page and keeps edited quantities", () => {
  openShortages();
  fireEvent.change(screen.getByLabelText("Tedarikçi", { exact: true }), { target: { value: "ata" } });
  fireEvent.click(screen.getAllByRole("button", { name: "Sonraki" })[0]!);
  expect(screen.getAllByText(/Sayfa 2 \/ 2/)).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "52 alım adedini 100 artır" }));

  const sort = screen.getByLabelText("Sıralama");
  const rows = () => within(screen.getByRole("table")).getAllByRole("row");
  fireEvent.change(sort, { target: { value: "stockAsc" } });
  expect(screen.getAllByText(/Sayfa 1 \/ 2/)).toHaveLength(2);
  expect(rows()[1]).toHaveTextContent("Klips 52");
  expect(screen.getByRole("spinbutton", { name: "52 alım adedi" })).toHaveValue(200);

  fireEvent.change(sort, { target: { value: "stockDesc" } });
  expect(rows()[1]).toHaveTextContent("Klips 2");
});

it("adds a product directly from the last cell with its current quantity and supplier", async () => {
  openShortages();
  fireEvent.change(screen.getByLabelText("KM No / ürün / tedarikçi kodu"), { target: { value: "Klips 2" } });
  const row = within(screen.getByText("Klips 2", { exact: true }).closest("tr")!);
  const add = within(row.getAllByRole("cell").at(-1)!).getByRole("button", { name: "2 ürününü listeye ekle" });
  await waitFor(() => expect(add).toBeEnabled());
  fireEvent.click(row.getByRole("button", { name: "2 alım adedini 100 artır" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "20 ürününü seç" }));
  fireEvent.click(add);

  const draft = within(screen.getByRole("region", { name: "Alım listesi" }));
  expect(await draft.findByRole("spinbutton", { name: "2 liste alım adedi" })).toHaveValue(200);
  expect(draft.getByRole("combobox", { name: "2 liste tedarikçisi" })).toHaveValue("ata");
  expect(screen.getByRole("checkbox", { name: "20 ürününü seç" })).toBeChecked();

  fireEvent.click(row.getByRole("button", { name: "2 alım adedini 100 artır" }));
  fireEvent.click(add);
  await waitFor(() => expect(draft.getByRole("spinbutton", { name: "2 liste alım adedi" })).toHaveValue(300));
  expect(draft.getAllByRole("row")).toHaveLength(2);
});

it("restores saved quantities and suppliers for the owner and persists removals", async () => {
  const first = openShortages();
  const add = screen.getByRole("button", { name: "2 ürününü listeye ekle" });
  await waitFor(() => expect(add).toBeEnabled());
  fireEvent.click(add);

  const draft = within(screen.getByRole("region", { name: "Alım listesi" }));
  const quantity = await draft.findByRole("spinbutton", { name: "2 liste alım adedi" });
  fireEvent.change(quantity, { target: { value: "400" } });
  await waitFor(() => expect(quantity).toHaveValue(400));
  fireEvent.change(draft.getByRole("combobox", { name: "2 liste tedarikçisi" }), { target: { value: "star" } });
  expect(await draft.findByText("ST-2")).toBeInTheDocument();
  first.unmount();

  const other = openShortages("admin-b");
  expect(await screen.findByText("Alım listesi boş.")).toBeInTheDocument();
  other.unmount();

  const restored = openShortages();
  const list = within(await screen.findByRole("region", { name: "Alım listesi" }));
  expect(list.getByRole("spinbutton", { name: "2 liste alım adedi" })).toHaveValue(400);
  expect(list.getByRole("combobox", { name: "2 liste tedarikçisi" })).toHaveValue("star");
  fireEvent.click(list.getByRole("button", { name: "2 listeden çıkar" }));
  expect(await list.findByText("Alım listesi boş.")).toBeInTheDocument();
  restored.unmount();

  openShortages();
  expect(await screen.findByText("Alım listesi boş.")).toBeInTheDocument();
});

it("keeps a rejected addition selected so the admin can retry", async () => {
  openShortages();
  database.rejectWrite = true;
  const selected = screen.getByRole("checkbox", { name: "2 ürününü seç" });
  fireEvent.click(selected);
  const add = screen.getByRole("button", { name: "Seçilenleri listeye ekle (1)" });
  await waitFor(() => expect(add).toBeEnabled());
  fireEvent.click(add);
  await waitFor(() => expect(add).toBeEnabled());
  expect(selected).toBeChecked();
  expect(screen.getByText("Alım listesi boş.")).toBeInTheDocument();

  database.rejectWrite = false;
  fireEvent.click(add);
  expect(await screen.findByRole("spinbutton", { name: "2 liste alım adedi" })).toHaveValue(100);
  await waitFor(() => expect(selected).not.toBeChecked());
});
