import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { slicerAuthorized } from '@/lib/slicer-auth';

const body = z.union([
  z.object({ id: z.string().uuid(), grams: z.number().positive().max(100000), seconds: z.number().int().positive().max(60 * 86400) }),
  z.object({ id: z.string().uuid(), error: z.string().trim().min(1).max(500) }),
]);

export const Route = createFileRoute('/api/public/slicer/result')({
  server: { handlers: { POST: async ({ request }) => {
    if (!slicerAuthorized(request)) return new Response('Unauthorized', { status: 401 });
    const parsed = body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response('Invalid result', { status: 400 });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const d = parsed.data;
    const patch = 'error' in d
      ? { slice_status: 'failed', slice_error: d.error, slice_updated_at: new Date().toISOString() }
      : { slice_status: 'done', slice_grams: Math.ceil(d.grams), slice_seconds: d.seconds, slice_error: null, slice_updated_at: new Date().toISOString() };
    const saved = await supabaseAdmin.from('quote_requests').update(patch).eq('id', d.id).eq('slice_status', 'slicing').select('id');
    if (saved.error) return new Response('Save failed', { status: 500 });
    if (!saved.data?.length) return new Response('Not claimed', { status: 409 });
    return Response.json({ ok: true });
  } } },
});
