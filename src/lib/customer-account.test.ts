import { describe, expect, it } from 'vitest';
import { accountDestination, messageSchema, unreadMessages } from './customer-account';
describe('account access and conversations', () => {
  it('sends customers to their orders, never the workshop', () => { expect(accountDestination(false)).toBe('/account'); });
  it('sends administrators to the workshop', () => { expect(accountDestination(true)).toBe('/admin'); });
  it('rejects blank messages', () => { expect(messageSchema.safeParse({ requestId: '11111111-1111-4111-8111-111111111111', body: '   ' }).success).toBe(false); });
  it('counts only unread incoming messages on the selected request', () => {
    expect(unreadMessages([{ request_id:'r',sender_id:'other',created_at:'2026-11-15T12:00:00Z' }, { request_id:'r',sender_id:'me',created_at:'2026-11-15T13:00:00Z' }, { request_id:'other',sender_id:'other',created_at:'2026-11-15T13:00:00Z' }], [], 'me', 'r')).toBe(1);
    expect(unreadMessages([{ request_id:'r',sender_id:'other',created_at:'2026-11-15T12:00:00Z' }], [{ request_id:'r',read_at:'2026-11-15T12:00:00Z' }], 'me', 'r')).toBe(0);
  });
});