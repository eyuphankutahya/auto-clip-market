import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { product_id: string; name: string; price: number; quantity: number; stock?: number; sku?: string | null; added_at?: string };
/** Clamps a cart quantity to 1..stock (stock unknown = no upper bound). */
export const clampQty = (q: number, stock?: number) => { const n = Math.max(1, Math.floor(Number.isFinite(q) ? q : 1)); return stock === undefined ? n : Math.min(n, Math.max(0, stock)); };
type Ctx = { items: CartItem[]; add: (i: Omit<CartItem, "quantity" | "added_at">, q?: number) => boolean; setQty: (id: string, q: number) => void; remove: (id: string) => void; clear: () => void; count: number };
const CartCtx = createContext<Ctx | null>(null);
const noCart: Ctx = { items: [], add: () => false, setQty: () => {}, remove: () => {}, clear: () => {}, count: 0 };
const KEY = "klips-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ } }, []);
  const save = (next: CartItem[]) => { setItems(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  const add: Ctx["add"] = (i, q = 1) => {
    const ex = items.find((x) => x.product_id === i.product_id);
    const wanted = (ex?.quantity ?? 0) + q;
    if (i.stock !== undefined && wanted > i.stock) return false;
    save(ex ? items.map((x) => (x.product_id === i.product_id ? { ...x, ...i, quantity: wanted } : x)) : [...items, { ...i, quantity: q, added_at: new Date().toISOString() }]);
    return true;
  };
  const setQty = (id: string, q: number) => save(items.map((x) => (x.product_id === id ? { ...x, quantity: clampQty(q, x.stock) } : x)));
  const remove = (id: string) => save(items.filter((x) => x.product_id !== id));
  const clear = () => save([]);
  return <CartCtx.Provider value={{ items, add, setQty, remove, clear, count: items.reduce((s, x) => s + x.quantity, 0) }}>{children}</CartCtx.Provider>;
}
/** Falls back to an empty cart if rendered outside the provider (e.g. during hot reload). */
export const useCart = () => useContext(CartCtx) ?? noCart;
