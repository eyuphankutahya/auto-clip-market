import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Route } from "@/routes/_authenticated/admin.eksik-stok";

vi.mock("@/components/site/ProductImage", () => ({ ProductImage: () => null }));
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const query = await importOriginal<typeof import("@tanstack/react-query")>();
  const supplier = { id: "ata", name: "ATA" };
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
  return { ...query, useSuspenseQuery: () => ({ data: { products, suppliers: [supplier] } }) };
});

it("sorts the entire filtered shortage list, resets the page and keeps edited quantities", () => {
  const Shortages = Route.options.component!;
  render(<Shortages />);
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

it("adds a product directly from the last cell with its current quantity and supplier", () => {
  const Shortages = Route.options.component!;
  render(<Shortages />);
  fireEvent.change(screen.getByLabelText("KM No / ürün / tedarikçi kodu"), { target: { value: "Klips 2" } });
  const row = within(screen.getByText("Klips 2", { exact: true }).closest("tr")!);
  const add = within(row.getAllByRole("cell").at(-1)!).getByRole("button", { name: "2 ürününü listeye ekle" });
  fireEvent.click(row.getByRole("button", { name: "2 alım adedini 100 artır" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "20 ürününü seç" }));
  fireEvent.click(add);

  const draft = within(screen.getByRole("region", { name: "Alım listesi" }));
  expect(draft.getByRole("spinbutton", { name: "2 liste alım adedi" })).toHaveValue(200);
  expect(draft.getByRole("combobox", { name: "2 liste tedarikçisi" })).toHaveValue("ata");
  expect(screen.getByRole("checkbox", { name: "20 ürününü seç" })).toBeChecked();

  fireEvent.click(row.getByRole("button", { name: "2 alım adedini 100 artır" }));
  fireEvent.click(add);
  expect(draft.getByRole("spinbutton", { name: "2 liste alım adedi" })).toHaveValue(300);
  expect(draft.getAllByRole("row")).toHaveLength(2);
});
