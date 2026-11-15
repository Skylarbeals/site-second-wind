import { describe, it, expect } from 'vitest';
import { addLine, setLineQty, cartTotal } from './cart';
const item = { id: 'a', name: 'Vase', price_cents: 1250, image_url: null, max: 2 };
describe('cart', () => {
  it('never exceeds available quantity', () => { expect(addLine(addLine(addLine([], item), item), item)[0]?.qty).toBe(2); });
  it('does not add sold-out items', () => { expect(addLine([], { ...item, max: 0 })).toEqual([]); });
  it('removes line at zero and totals', () => { const l = addLine([], item); expect(setLineQty(l, 'a', 0)).toEqual([]); expect(cartTotal(setLineQty(l, 'a', 2))).toBe(2500); });
});
