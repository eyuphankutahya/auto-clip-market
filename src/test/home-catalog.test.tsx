import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { Route } from "@/routes/index";

const { navigate, query } = vi.hoisted(() => ({ navigate: vi.fn(), query: vi.fn() }));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(), useQuery: query,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useNavigate: () => navigate,
  Link: ({ children, to, search = {}, hash }: { children: React.ReactNode; to: string; search?: Record<string, string>; hash?: string }) => {
    const params = new URLSearchParams(search).toString();
    return <a href={`${to}${params ? `?${params}` : ""}${hash ? `#${hash}` : ""}`}>{children}</a>;
  },
}));

const clipGroup = { id: "clips", name: "KLİPS", slug: "klips", parent_id: null };
const bumper = { id: "category-1", name: "Tampon Klipsleri", slug: "tampon", parent_id: "clips" };
const Home = Route.options.component!;
beforeEach(() => {
  vi.clearAllMocks();
  query.mockImplementation(({ queryKey }: { queryKey: string[] }) => queryKey[0] === "catalog-filters"
    ? { data: { categories: [clipGroup, bumper], brands: [{ id: "brand-1", name: "Renault", slug: "renault" }] } }
    : { data: { products: [] } });
});

it("opens the catalog with the trimmed OEM or product code", () => {
  render(<Home />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Katalogda ürün ara" }), { target: { value: " 7703077469 " } });
  fireEvent.click(screen.getByRole("button", { name: "Ara" }));
  expect(navigate).toHaveBeenCalledWith({ to: "/urunler", search: { q: "7703077469" } });
});

it("opens the chosen brand, main group, clip subcategory and contact form", () => {
  render(<Home />);
  const show = screen.getByRole("button", { name: "Ürünleri göster" });
  expect(show).toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: "Araç markası" }), { target: { value: "renault" } });
  fireEvent.click(show);
  expect(navigate).toHaveBeenCalledWith({ to: "/urunler", search: { marka: "renault" } });
  expect(screen.getByRole("link", { name: "KLİPS" })).toHaveAttribute("href", "/urunler?kategori=klips");
  expect(screen.getByRole("link", { name: "Tampon Klipsleri" })).toHaveAttribute("href", "/urunler?kategori=tampon");
  expect(screen.getByRole("link", { name: "Talep oluştur" })).toHaveAttribute("href", "/iletisim#mesaj");
});

it("lets users expand the clip subcategory preview to all clip types", () => {
  const categories = [clipGroup, ...Array.from({ length: 7 }, (_, index) => ({ id: String(index), name: `Kategori ${index + 1}`, slug: `kategori-${index + 1}`, parent_id: "clips" }))];
  query.mockImplementation(({ queryKey }: { queryKey: string[] }) => queryKey[0] === "catalog-filters"
    ? { data: { categories, brands: [] } }
    : { data: { products: [] } });
  render(<Home />);
  expect(screen.queryByRole("link", { name: "Kategori 7" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tüm KLİPS türlerini göster (7)" }));
  expect(screen.getByRole("link", { name: "Kategori 7" })).toHaveAttribute("href", "/urunler?kategori=kategori-7");
  expect(screen.getByRole("button", { name: "Daha az kategori göster" })).toHaveAttribute("aria-expanded", "true");
});
