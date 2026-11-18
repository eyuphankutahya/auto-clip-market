import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/sepet";

const { refetch, rpc, clear, receipt, info, useCart, useQuery } = vi.hoisted(() => ({
  refetch: vi.fn(), rpc: vi.fn(), clear: vi.fn(), receipt: vi.fn(), info: vi.fn(), useCart: vi.fn(), useQuery: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(), Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: receipt }) }) }) } }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "user-1" }, loading: false }) }));
vi.mock("@/lib/cart", () => ({ useCart }));
vi.mock("sonner", () => ({ toast: { info, success: vi.fn(), error: vi.fn() } }));

function quote(price: number, isActive = true, rate = 0) {
  return {
    products: new Map([["product-1", { price, stock: 100, is_active: isActive }]]),
    account: { id: "account-1", discount_rate: rate },
  };
}

const Cart = Route.options.component!;
const items = [{ product_id: "product-1", name: "Klips", sku: "KM-1", price: 10, quantity: 2, stock: 100, added_at: "2026-11-17T22:00:00Z" }];

describe("checkout revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    rpc.mockResolvedValue({ data: "order-1", error: null });
    receipt.mockResolvedValue({ data: { order_no: 42, created_at: "2026-11-18T10:00:00Z", total: 20 } });
    useCart.mockReturnValue({ items, setQty: vi.fn(), remove: vi.fn(), clear });
    useQuery.mockReturnValue({ data: quote(10), isError: false, refetch });
  });

  it("shows the identifier, added date and quantity for each line", () => {
    render(<Cart />);
    expect(screen.getByText("product-1")).toBeVisible();
    expect(screen.getByText("KM No KM-1")).toBeVisible();
    expect(screen.getByText("18 Kas 2026")).toHaveAttribute("datetime", items[0]!.added_at);
    expect(screen.getByRole("spinbutton", { name: "Klips adedi" })).toHaveValue(2);
  });

  it.each([quote(12), quote(10, true, 5)])("asks for review when price or discount has changed", async (latest) => {
    refetch.mockResolvedValue({ data: latest });
    render(<Cart />);
    fireEvent.click(screen.getByRole("button", { name: "Sipariş talebi gönder" }));
    await waitFor(() => expect(info).toHaveBeenCalled());
    expect(rpc).not.toHaveBeenCalled();
  });

  it("submits the order when the price and discount match the displayed quote", async () => {
    refetch.mockResolvedValue({ data: quote(10) });
    const { rerender } = render(<Cart />);
    fireEvent.click(screen.getByRole("button", { name: "Sipariş talebi gönder" }));
    await waitFor(() => expect(clear).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith("place_order_once", {
      _items: [{ product_id: "product-1", quantity: 2 }], _notes: "", _request_key: expect.any(String),
    });
    useCart.mockReturnValue({ items: [], clear });
    rerender(<Cart />);
    expect(await screen.findByText("#42")).toBeVisible();
    expect(screen.getByText("order-1")).toBeVisible();
  });
});
