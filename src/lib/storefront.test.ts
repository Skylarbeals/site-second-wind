import { describe, expect, it } from 'vitest';
import { queueCustomerRequest, validateModel, quoteDetailsSchema } from './storefront';
import type { Store } from './inventory';

const store: Store = { items: [{ id: 'spool', name: 'PLA black', sku: 'PLA', kind: 'material', material: 'PLA', color: 'Black', quantity: 1, unit: 'kg', threshold: 0, unitCost: 20, location: '', supplier: '', updatedAt: '2026-11-15', rollWeightKg: 1 }], orders: [], history: [] };
const request = { id: 'request-1', customer_name: 'Customer', file_name: 'part.stl' };
describe('customer requests', () => {
  it('saves a 90-minute estimate at $7.50 independently of $4 filament cost without deducting stock', () => {
    const next = queueCustomerRequest(store, request, 'spool', 200, 5400);
    expect(next.store.orders[0]?.printTimeSeconds).toBe(5400);
    expect(next.store.orders[0]?.printerRunningCost).toBe(7.5);
    expect(next.store.orders[0]?.materialCost).toBe(4);
    expect(next.store.items[0]?.quantity).toBe(1);
  });
  it('queues accepted requests without deducting filament', () => {
    const next = queueCustomerRequest(store, request, 'spool', 200);
    expect(next.store.orders[0]?.status).toBe('queued');
    expect(next.store.items[0]?.quantity).toBe(1);
  });
  it('does not duplicate a request accepted twice', () => {
    const first = queueCustomerRequest(store, request, 'spool', 200);
    expect(queueCustomerRequest(first.store, request, 'spool', 200).store.orders).toHaveLength(1);
  });
  it('accepts all original model formats and rejects other formats', () => {
    for (const ext of ['stl','3mf','obj','step','stp']) expect(() => validateModel({name:`part.${ext}`,size:100})).not.toThrow();
    expect(() => validateModel({name:'part.exe',size:100})).toThrow();
  });
  it('enforces the 50 MB model limit', () => {
    expect(() => validateModel({name:'part.stl',size:50*1024*1024})).not.toThrow();
    expect(() => validateModel({name:'part.stl',size:50*1024*1024+1})).toThrow();
  });
  it('rejects invalid customer contact details', () => {
    expect(quoteDetailsSchema.safeParse({customer_name:'Customer', customer_email:'not-email', material:'PLA',color:'Black',comment:''}).success).toBe(false);
  });
});