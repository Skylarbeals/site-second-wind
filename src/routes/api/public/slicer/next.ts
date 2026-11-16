import { createFileRoute } from '@tanstack/react-router';
import { slicerAuthorized } from '@/lib/slicer-auth';

// Workshop slicer runner claims the oldest waiting quote and gets a short-lived model download link.
export const Route = createFileRoute('/api/public/slicer/next')({
  server: { handlers: { POST: async ({ request }) => {
    if (!slicerAuthorized(request)) return new Response('Unauthorized', { status: 401 });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const stale = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    await supabaseAdmin.from('quote_requests').update({ slice_status: 'pending' }).eq('slice_status', 'slicing').lt('slice_updated_at', stale);
    const next = await supabaseAdmin.from('quote_requests').select('id,file_path,file_name').eq('status', 'new').eq('slice_status', 'pending').order('created_at').limit(1).maybeSingle();
    if (next.error) return new Response('Lookup failed', { status: 500 });
    if (!next.data) return new Response(null, { status: 204 });
    const claim = await supabaseAdmin.from('quote_requests').update({ slice_status: 'slicing', slice_updated_at: new Date().toISOString(), slice_error: null }).eq('id', next.data.id).eq('slice_status', 'pending').select('id');
    if (claim.error || !claim.data?.length) return new Response(null, { status: 204 });
    const link = await supabaseAdmin.storage.from('quote-files').createSignedUrl(next.data.file_path, 600);
    if (link.error) return new Response('Model link failed', { status: 500 });
    return Response.json({ id: next.data.id, fileName: next.data.file_name, downloadUrl: link.data.signedUrl });
  } } },
});
