import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { unreadMessages } from '@/lib/customer-account';
import { useAccountSession } from './account-session';

export function useUnreadMessages() {
  const { user } = useAccountSession(); const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!user) { setCounts({}); return; }
    let active = true;
    const load = async () => {
      const [messages, reads] = await Promise.all([supabase.from('customer_messages').select('request_id,sender_id,created_at'), supabase.from('message_reads').select('request_id,read_at').eq('user_id', user.id)]);
      if (!active || messages.error || reads.error) return;
      setCounts(Object.fromEntries([...new Set(messages.data.map(m => m.request_id))].map(id => [id, unreadMessages(messages.data, reads.data, user.id, id)])));
    };
    void load();
    const channel = supabase.channel(`unread-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'customer_messages' }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'message_reads', filter: `user_id=eq.${user.id}` }, () => void load()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [user]);
  return counts;
}