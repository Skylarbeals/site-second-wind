import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { messageSchema } from './customer-account';

export const getCustomerOrders = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const result = await context.supabase.from('quote_requests').select('*').eq('customer_user_id', context.userId).order('created_at', { ascending: false });
  if (result.error) throw new Error('Your orders could not be loaded.');
  return result.data;
});
export const getConversation = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ requestId: z.string().uuid() })).handler(async ({ data, context }) => {
  const result = await context.supabase.from('customer_messages').select('*').eq('request_id', data.requestId).order('created_at');
  if (result.error) throw new Error('Messages could not be loaded.');
  return { messages: result.data, userId: context.userId };
});
export const sendCustomerMessage = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(messageSchema).handler(async ({ data, context }) => {
  const result = await context.supabase.from('customer_messages').insert({ request_id: data.requestId, sender_id: context.userId, body: data.body });
  if (result.error) throw new Error('Your message could not be sent. Please try again.');
});
export const markConversationRead = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(z.object({ requestId: z.string().uuid(), readAt: z.string().datetime() })).handler(async ({ data, context }) => {
  const result = await context.supabase.from('message_reads').upsert({ request_id: data.requestId, user_id: context.userId, read_at: data.readAt });
  if (result.error) throw new Error('Read status could not be saved.');
});