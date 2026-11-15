import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { MessageSquare, Package, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getCustomerOrders } from '@/lib/customer-account.functions';
import { useAccountSession } from './account-session';
import { StorefrontShell } from './catalog';
import { MessageThread } from './message-thread';

const stages: Record<string, string> = { received: 'Received', queued: 'In queue', in_progress: 'On the print bed', completed: 'Completed', closed: 'Closed' };
export function CustomerAccountPage() {
  const fetch = useServerFn(getCustomerOrders); const cache = useQueryClient(); const { user } = useAccountSession();
  const [past, setPast] = useState(false); const [selected, setSelected] = useState('');
  const orders = useQuery({ queryKey: ['customer-orders', user?.id], queryFn: () => fetch(), enabled: !!user });
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`customer-orders-${crypto.randomUUID()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'quote_requests', filter: `customer_user_id=eq.${user.id}` }, () => void cache.invalidateQueries({ queryKey: ['customer-orders'] })).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, cache]);
  const rows = (orders.data ?? []).filter(r => past === ['completed', 'closed'].includes(r.customer_stage));
  return <StorefrontShell><main className="storefront-main"><header className="storefront-section-head"><div><p className="storefront-kicker">YOUR ACCOUNT</p><h1>My orders</h1></div><Button asChild><Link to="/quote"><Plus />New request</Link></Button></header><div className="storefront-filters" role="group" aria-label="Order history"><Button variant={!past ? 'default' : 'outline'} aria-pressed={!past} onClick={() => setPast(false)}>Active orders</Button><Button variant={past ? 'default' : 'outline'} aria-pressed={past} onClick={() => setPast(true)}>Past orders</Button></div>{orders.isPending ? <p>Loading your orders…</p> : orders.error ? <p role="alert" className="quote-error">Your orders could not be loaded. <Button variant="outline" onClick={() => void orders.refetch()}>Try again</Button></p> : !rows.length ? <div className="storefront-empty"><Package /><h3>{past ? 'No past orders yet.' : 'No active orders yet.'}</h3></div> : rows.map(r => <article className="account-order" key={r.id}><header><div><h2>{r.file_name}</h2><p>{r.material} · {r.color} · {new Date(r.created_at).toLocaleDateString()}</p></div><span className="badge">{stages[r.customer_stage] ?? 'Received'}</span></header>{r.comment && <p>{r.comment}</p>}<ol className="order-progress" aria-label="Order progress">{['received', 'queued', 'in_progress', 'completed'].map((stage, i) => <li className={['received', 'queued', 'in_progress', 'completed'].indexOf(r.customer_stage) >= i ? 'reached' : ''} key={stage}>{stages[stage]}</li>)}</ol><Button variant="outline" onClick={() => setSelected(selected === r.id ? '' : r.id)}>{selected === r.id ? <X /> : <MessageSquare />}{selected === r.id ? 'Close messages' : 'Messages'}</Button>{selected === r.id && <MessageThread requestId={r.id} />}</article>)}</main></StorefrontShell>;
}