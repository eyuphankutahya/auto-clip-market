import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { product_id: string; name: string; price: number; quantity: number };
type Ctx = { items: CartItem[]; add: (i: Omit<CartItem, "quantity">, q?: number) => void; setQty: (id: string, q: number) => void; remove: (id: string) => void; clear: () => void; count: number };
const CartCtx = createContext<Ctx>(null as unknown as Ctx);
const KEY = "klips-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* ignore */ } }, []);
  const save = (next: CartItem[]) => { setItems(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  const add: Ctx["add"] = (i, q = 1) => {
    const ex = items.find((x) => x.product_id === i.product_id);
    save(ex ? items.map((x) => (x.product_id === i.product_id ? { ...x, quantity: x.quantity + q } : x)) : [...items, { ...i, quantity: q }]);
  };
  const setQty = (id: string, q: number) => save(items.map((x) => (x.product_id === id ? { ...x, quantity: Math.max(1, q) } : x)));
  const remove = (id: string) => save(items.filter((x) => x.product_id !== id));
  const clear = () => save([]);
  return <CartCtx.Provider value={{ items, add, setQty, remove, clear, count: items.reduce((s, x) => s + x.quantity, 0) }}>{children}</CartCtx.Provider>;
}
export const useCart = () => useContext(CartCtx);
