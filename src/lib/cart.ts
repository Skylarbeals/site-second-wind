import { useEffect, useState } from 'react';

export type CartLine = { id: string; name: string; price_cents: number; image_url: string | null; qty: number; max: number };
const KEY = 'printfire-cart-v1';
const EVENT = 'printfire-cart';

export function addLine(lines: CartLine[], item: Omit<CartLine, 'qty'>, qty = 1): CartLine[] {
  const found = lines.find(l => l.id === item.id);
  if (found) return lines.map(l => l.id === item.id ? { ...l, ...item, qty: Math.min(item.max, l.qty + qty) } : l);
  return item.max > 0 ? [...lines, { ...item, qty: Math.min(item.max, qty) }] : lines;
}
export function setLineQty(lines: CartLine[], id: string, qty: number): CartLine[] {
  return qty <= 0 ? lines.filter(l => l.id !== id) : lines.map(l => l.id === id ? { ...l, qty: Math.min(l.max, qty) } : l);
}
export const cartTotal = (lines: CartLine[]) => lines.reduce((s, l) => s + l.price_cents * l.qty, 0);
export const cartCount = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);

function read(): CartLine[] { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }

export function useCart() {
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => { const sync = () => setLines(read()); sync(); window.addEventListener(EVENT, sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); }; }, []);
  const save = (next: CartLine[]) => { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event(EVENT)); };
  return {
    lines,
    add: (item: Omit<CartLine, 'qty'>) => save(addLine(read(), item)),
    setQty: (id: string, qty: number) => save(setLineQty(read(), id, qty)),
    clear: () => save([]),
  };
}
