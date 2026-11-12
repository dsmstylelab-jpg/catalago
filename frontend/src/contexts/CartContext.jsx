import { createContext, useContext, useState } from 'react';
const Context = createContext(null);
const KEY = 'dsm-cart';
const initial = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };

export function CartProvider({ children }) {
  const [items, setItems] = useState(initial);
  const update = (fn) => setItems((old) => { const next = fn(old); localStorage.setItem(KEY, JSON.stringify(next)); return next; });
  const add = (product, variant) => update((old) => {
    if (old.some((x) => x.variantId === variant.id))
      return old.map((x) => x.variantId === variant.id ? { ...x, quantity: Math.min(x.quantity + 1, Number(variant.stock)) } : x);
    return [...old, {
      variantId: variant.id, productId: product.id, slug: product.slug, name: product.name,
      image: product.image || product.images?.[0]?.url, brand: product.brand,
      size: variant.size, color: variant.color, price: Number(variant.price), stock: Number(variant.stock), quantity: 1
    }];
  });
  const change = (variantId, quantity) => update((old) => old.map((x) => x.variantId === variantId ? { ...x, quantity: Math.min(Math.max(1, quantity), x.stock) } : x));
  const remove = (id) => update((old) => old.filter((x) => x.variantId !== id));
  const clear = () => update(() => []);
  const count = items.reduce((s, x) => s + x.quantity, 0);
  const total = items.reduce((s, x) => s + x.price * x.quantity, 0);
  return <Context.Provider value={{ items, add, change, remove, clear, count, total }}>{children}</Context.Provider>;
}
export const useCart = () => useContext(Context);
