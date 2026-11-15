import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { queueCustomerRequest } from './storefront';
import type { Store } from './inventory';

export const getCatalog = createServerFn({ method: 'GET' }).handler(async () => {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('The shop is temporarily unavailable.');
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
    headers.set('apikey', key);
    return fetch(input, { ...init, headers });
  } } });
  const [products, filaments] = await Promise.all([
    client.from('inventory_items').select('id,name,description,price_cents,quantity,image_url,created_at').order('created_at', { ascending: false }),
    client.from('filaments').select('id,name,material,color,color_hex,best_used_for,in_stock,created_at').order('name'),
  ]);
  if (products.error || filaments.error) throw new Error('The catalog could not be loaded. Please try again.');
  return { products: products.data, filaments: filaments.data };
});

export const acceptCustomerRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), materialItemId: z.string().min(1), grams: z.number().int().positive() }))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (role.error || !role.data) throw new Error('Only the workshop team can accept requests.');
    const [quote, shop] = await Promise.all([
      context.supabase.from('quote_requests').select('*').eq('id', data.id).single(),
      context.supabase.from('shop_state').select('data,updated_at').eq('id', 'main').single(),
    ]);
    if (quote.error || shop.error) throw new Error('The request or inventory could not be loaded.');
    if (quote.data.status === 'closed') throw new Error('This request is closed.');
    const next = queueCustomerRequest(shop.data.data as unknown as Store, quote.data, data.materialItemId, data.grams);
    const saved = await context.supabase.rpc('accept_quote_into_shop', { request_id: data.id, expected_updated_at: shop.data.updated_at, next_store: next.store as never, next_order_id: next.orderId });
    if (saved.error) throw new Error('Your shop changed while accepting this request. Refresh and try again.');
    return next.store;
  });