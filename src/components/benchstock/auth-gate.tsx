import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { applyRemoteStore, getStore, setRemoteWriter, type Store } from '@/lib/inventory';

const SHOP_ID = 'main';

function hasData(s: Store) { return s.items.length + s.orders.length + s.history.length > 0; }

/** Shows a sign-in screen until a team member is signed in, then keeps inventory synced with the cloud. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState('');
  const href = useLocation({ select: location => location.href });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: d }) => { setSession(d.session); setChecked(true); });
  }, [href]);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) { setSynced(false); setRemoteWriter(null); return; }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const push = (store: Store) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.from('shop_state').upsert({ id: SHOP_ID, data: store as never, updated_at: new Date().toISOString(), updated_by: userId })
          .then(({ error }) => { if (error) console.error('Cloud save failed', error); });
      }, 400);
    };
    (async () => {
      const role = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
      if (cancelled) return;
      if (role.error || !role.data) { setSyncError('This account does not have workshop access.'); return; }
      const { data, error } = await supabase.from('shop_state').select('data').eq('id', SHOP_ID).maybeSingle();
      if (cancelled) return;
      if (error) { setSyncError('Your shop could not be loaded. Please refresh to try again.'); return; }
      else if (data?.data) applyRemoteStore(data.data);
      else { const local = getStore(); if (hasData(local)) push(local); } // first sign-in: upload this browser's inventory
      setRemoteWriter(push);
      setSynced(true);
    })();
    const channel = supabase.channel(`shop-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_state' }, (payload) => {
        const row = payload.new as { data?: unknown; updated_by?: string };
        if (row?.data) applyRemoteStore(row.data);
      })
      .subscribe();
    return () => { cancelled = true; clearTimeout(timer); setRemoteWriter(null); supabase.removeChannel(channel); };
  }, [userId]);

  if (!checked) return null;
  if (!session) return <SignIn />;
  if (syncError) return <div className="auth-wrap"><div><p role="alert">{syncError}</p><SignOutButton/></div></div>;
  if (!synced) return <div className="auth-wrap"><p className="page-desc">Loading your shop…</p></div>;
  return <>{children}</>;
}

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError('Wrong email or password.');
    else await navigate({ to: '/admin' });
    setBusy(false);
  };
  return <div className="auth-wrap">
    <form className="auth-card" onSubmit={submit}>
      <div className="page-kicker">BENCHSTOCK</div>
      <h1 className="page-title">Sign in</h1>
      <p className="page-desc">Only invited team members can open this shop.</p>
      <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>
      {error && <p className="auth-error">{error}</p>}
      <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
    </form>
  </div>;
}

export function SignOutButton() {
  const cache = useQueryClient(); const navigate = useNavigate();
  const signOut = async () => { await cache.cancelQueries(); cache.clear(); setRemoteWriter(null); await supabase.auth.signOut(); await navigate({to:'/auth',replace:true}); };
  return <Button type="button" variant="ghost" className="auth-signout" onClick={()=>void signOut()}>Sign out</Button>;
}
