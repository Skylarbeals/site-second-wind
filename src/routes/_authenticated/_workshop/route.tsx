import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AuthGate } from '@/components/benchstock/auth-gate';
import { AppShell } from '@/components/benchstock/pages';
export const Route = createFileRoute('/_authenticated/_workshop')({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: '/auth' });
    const role = await supabase.rpc('has_role', { _user_id: data.user.id, _role: 'admin' });
    if (role.error || !role.data) throw redirect({ to: '/account' });
  },
  component: WorkshopLayout,
});
function WorkshopLayout() { return <AuthGate><AppShell><Outlet /></AppShell></AuthGate>; }