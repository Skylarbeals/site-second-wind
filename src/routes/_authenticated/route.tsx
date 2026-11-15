import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AuthGate } from '@/components/benchstock/auth-gate';
import { AppShell } from '@/components/benchstock/pages';

export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: '/auth' });
  },
  component: WorkshopLayout,
});
function WorkshopLayout() { return <AuthGate><AppShell><Outlet/></AppShell></AuthGate>; }