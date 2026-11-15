import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useLocation } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

const AccountContext = createContext<{ user: User | null; admin: boolean; ready: boolean }>({ user: null, admin: false, ready: false });
export function AccountSession({ children }: { children: ReactNode }) {
  const href = useLocation({ select: l => l.href });
  const [state, setState] = useState({ user: null as User | null, admin: false, ready: false });
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const role = user ? await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }) : null;
      if (active) setState({ user, admin: role?.data === true, ready: true });
    })();
    return () => { active = false; };
  }, [href]);
  return <AccountContext.Provider value={state}>{children}</AccountContext.Provider>;
}
export const useAccountSession = () => useContext(AccountContext);