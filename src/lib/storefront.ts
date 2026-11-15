import { z } from 'zod';
import type { Tables } from '@/integrations/supabase/types';
import { createOrder, type Store } from './inventory';

export type Product = Tables<'inventory_items'>;
export type Filament = Tables<'filaments'>;
export type QuoteRequest = Tables<'quote_requests'>;
export const MAX_MODEL_BYTES = 50 * 1024 * 1024;
export const MODEL_EXTENSIONS = ['stl', '3mf', 'obj', 'step', 'stp'];
export const quoteDetailsSchema = z.object({
  customer_name: z.string().trim().min(1).max(100),
  customer_email: z.string().trim().email().max(255),
  material: z.string().trim().min(1).max(60),
  color: z.string().trim().min(1).max(60),
  comment: z.string().trim().max(1000),
});
export const productSchema = z.object({ name: z.string().trim().min(1).max(100), description: z.string().max(1000), price_cents: z.number().int().nonnegative(), quantity: z.number().int().nonnegative(), image_url: z.union([z.literal(''), z.string().url().refine(v => v.startsWith('https://'))]) });
export const filamentSchema = z.object({ name: z.string().trim().min(1).max(100), material: z.string().trim().min(1).max(60), color: z.string().trim().min(1).max(60), color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), best_used_for: z.string().max(1000), in_stock: z.boolean() });
export function validateModel(file: { name: string; size: number }) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !MODEL_EXTENSIONS.includes(ext)) throw new Error('Choose an STL, 3MF, OBJ, STEP, or STP model.');
  if (file.size <= 0 || file.size > MAX_MODEL_BYTES) throw new Error('Your model must be between 1 byte and 50 MB.');
  if (file.name.length > 180) throw new Error('Please shorten the file name to 180 characters or fewer.');
}
export function queueCustomerRequest(store: Store, request: Pick<QuoteRequest, 'id' | 'customer_name' | 'file_name'>, materialItemId: string, grams: number) {
  const id = `quote-${request.id}`;
  if (store.orders.some(order => order.id === id)) return { store, orderId: id };
  const result = createOrder(store, { orderName: `${request.customer_name} · ${request.file_name}`, materialItemId, grams, status: 'queued' });
  return { store: { ...result.store, orders: result.store.orders.map(order => order.id === result.order.id ? { ...order, id } : order) }, orderId: id };
}