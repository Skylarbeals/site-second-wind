import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { getConversation, markConversationRead, sendCustomerMessage } from '@/lib/customer-account.functions';
import type { Tables } from '@/integrations/supabase/types';

export function MessageThread({ requestId }: { requestId: string }) {
  const fetch = useServerFn(getConversation); const send = useServerFn(sendCustomerMessage); const mark = useServerFn(markConversationRead);
  const [messages, setMessages] = useState<Tables<'customer_messages'>[]>([]);
  const [userId, setUserId] = useState(''); const [body, setBody] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => { try {
      const result = await fetch({ data: { requestId } });
      if (!active) return;
      setMessages(result.messages); setUserId(result.userId); setLoading(false);
      const latest = result.messages.at(-1);
      if (latest) await mark({ data: { requestId, readAt: latest.created_at } });
    } catch (e) { if (active) { setError(e instanceof Error ? e.message : 'Messages unavailable.'); setLoading(false); } } };
    void load();
    const channel = supabase.channel(`conversation-${crypto.randomUUID()}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'customer_messages', filter: `request_id=eq.${requestId}` }, () => void load()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [requestId, fetch, mark]);
  return <section className="message-thread" aria-label="Order conversation"><h3>Messages</h3><div className="message-history" aria-live="polite">{loading ? <p>Loading messages…</p> : messages.length === 0 ? <p className="text-muted-foreground">No messages yet.</p> : messages.map(m => <article key={m.id} className={m.sender_id === userId ? 'message-line message-mine' : 'message-line'}><div className="message-meta"><strong>{m.sender_is_admin ? 'Workshop team' : 'Customer'}</strong><time>{new Date(m.created_at).toLocaleString()}</time></div><p>{m.body}</p></article>)}</div><form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await send({ data: { requestId, body } }); setBody(''); const result = await fetch({ data: { requestId } }); setMessages(result.messages); const latest = result.messages.at(-1); if (latest) await mark({ data: { requestId, readAt: latest.created_at } }); } catch (e) { setError(e instanceof Error ? e.message : 'Message not sent.'); } finally { setBusy(false); } }}><label>Message<textarea required maxLength={2000} rows={3} value={body} onChange={e => setBody(e.target.value)} /></label><Button type="submit" disabled={busy || !body.trim()}><Send />{busy ? 'Sending…' : 'Send message'}</Button></form>{error && <p role="alert" className="quote-error">{error}</p>}</section>;
}