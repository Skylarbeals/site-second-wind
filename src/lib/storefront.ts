import { z } from 'zod';
import type { Tables } from '@/integrations/supabase/types';
import { createOrder, type Store } from './inventory';

export type Product = Tables<'inventory_items'>;
export type Filament = Tables<'filaments'>;
export type QuoteRequest = Tables<'quote_requests'>;
export const MAX_MODEL_BYTES = 50 * 1024 * 1024;
export const MODEL_EXTENSIONS = ['stl', '3mf', 'obj', 'step', 'stp'];
/** Formats accepted on the advanced custom order tab (models, CAD drawings, blueprints). */
export const ADVANCED_EXTENSIONS = [...MODEL_EXTENSIONS, 'iges', 'igs', 'dxf', 'dwg', 'pdf', 'png', 'jpg', 'jpeg', 'f3d', 'skp', 'sldprt', 'ply', 'amf', 'zip'];
export const SLICEABLE_EXTENSIONS = ['stl', '3mf', 'obj', 'step', 'stp'];
export const advancedSettingsSchema = z.object({
  layer_height: z.number().min(0.04).max(0.4).nullable(),
  infill_percent: z.number().int().min(0).max(100).nullable(),
  orientation: z.string().trim().max(200).nullable(),
});
export const quoteDetailsSchema = z.object({
  customer_name: z.string().trim().min(1).max(100),
  customer_email: z.string().trim().email().max(255),
  material: z.string().trim().min(1).max(60),
  color: z.string().trim().min(1).max(60),
  comment: z.string().trim().max(1000),
});
export const productSchema = z.object({ name: z.string().trim().min(1).max(100), description: z.string().max(1000), price_cents: z.number().int().nonnegative(), quantity: z.number().int().nonnegative(), image_url: z.union([z.literal(''), z.string().url().refine(v => v.startsWith('https://'))]) });
export const filamentSchema = z.object({ name: z.string().trim().min(1).max(100), material: z.string().trim().min(1).max(60), color: z.string().trim().min(1).max(60), color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), best_used_for: z.string().max(1000), in_stock: z.boolean() });
export function validateModel(file: { name: string; size: number }, allowed: string[] = MODEL_EXTENSIONS) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !allowed.includes(ext)) throw new Error(`Choose a ${allowed.map(e=>e.toUpperCase()).join(', ')} file.`);
  if (file.size <= 0 || file.size > MAX_MODEL_BYTES) throw new Error('Your model must be between 1 byte and 50 MB.');
  if (file.name.length > 180) throw new Error('Please shorten the file name to 180 characters or fewer.');
}
export function queueCustomerRequest(store: Store, request: Pick<QuoteRequest, 'id' | 'customer_name' | 'file_name'>, materialItemId: string, grams: number, printTimeSeconds?: number) {
  const id = `quote-${request.id}`;
  if (store.orders.some(order => order.id === id)) return { store, orderId: id };
  const result = createOrder(store, { orderName: `${request.customer_name} · ${request.file_name}`, materialItemId, grams, status: 'queued', ...(printTimeSeconds !== undefined ? { printTimeSeconds } : {}) });
  return { store: { ...result.store, orders: result.store.orders.map(order => order.id === result.order.id ? { ...order, id } : order) }, orderId: id };
}
export type ColorOption = { name: string; hex: string; in_stock: boolean };
export const colorOptionSchema = z.object({ name: z.string().trim().min(1).max(60), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), in_stock: z.boolean() });
/** Reads a stored color list safely; falls back to the single legacy color. */
export function readColors(value: unknown, fallback?: { name?: string | null; hex?: string | null; in_stock?: boolean }): ColorOption[] {
  const list = Array.isArray(value) ? value.flatMap(v => { const p = colorOptionSchema.safeParse(v); return p.success ? [p.data] : []; }) : [];
  if (list.length || !fallback?.name) return list;
  return [{ name: fallback.name, hex: fallback.hex && /^#[0-9a-fA-F]{6}$/.test(fallback.hex) ? fallback.hex : '#f97316', in_stock: fallback.in_stock ?? true }];
}
