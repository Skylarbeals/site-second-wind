import { z } from 'zod';

export const messageSchema = z.object({ requestId: z.string().uuid(), body: z.string().trim().min(1).max(2000) });
export function accountDestination(isAdmin: boolean) { return isAdmin ? '/admin' as const : '/account' as const; }
export function unreadMessages(messages: { request_id: string; sender_id: string; created_at: string }[], reads: { request_id: string; read_at: string }[], userId: string, requestId: string) {
  const read = reads.find(r => r.request_id === requestId)?.read_at;
  return messages.filter(m => m.request_id === requestId && m.sender_id !== userId && (!read || m.created_at > read)).length;
}