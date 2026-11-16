ALTER TABLE public.quote_requests
  ADD COLUMN request_type text NOT NULL DEFAULT 'model' CHECK (request_type IN ('model','design_help','advanced')),
  ADD COLUMN layer_height numeric CHECK (layer_height IS NULL OR layer_height BETWEEN 0.04 AND 0.4),
  ADD COLUMN infill_percent integer CHECK (infill_percent IS NULL OR infill_percent BETWEEN 0 AND 100),
  ADD COLUMN orientation text CHECK (orientation IS NULL OR length(orientation) <= 200),
  ADD COLUMN blueprint_path text,
  ADD COLUMN blueprint_name text;

CREATE OR REPLACE FUNCTION public.valid_quote_file(request_id uuid, path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT path LIKE request_id::text || '/%' AND EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='quote-files' AND name=path AND lower(storage.extension(name)) IN ('stl','3mf','obj','step','stp','iges','igs','dxf','dwg','pdf','png','jpg','jpeg','f3d','skp','sldprt','ply','amf','zip') AND COALESCE((metadata->>'size')::bigint,0) BETWEEN 1 AND 52428800) $$;

DROP POLICY "Submit new quote only" ON public.quote_requests;
CREATE POLICY "Submit new quote only" ON public.quote_requests FOR INSERT TO anon,authenticated WITH CHECK(
  status='new' AND order_id IS NULL
  AND ((request_type='design_help' AND file_path='') OR public.valid_quote_file(id,file_path))
  AND (blueprint_path IS NULL OR public.valid_quote_file(id,blueprint_path)));

DROP POLICY "Upload model only" ON storage.objects;
CREATE POLICY "Upload model only" ON storage.objects FOR INSERT TO anon,authenticated WITH CHECK(bucket_id='quote-files' AND name ~* '^[0-9a-f-]{36}/[A-Za-z0-9_.-]+\.(stl|3mf|obj|step|stp|iges|igs|dxf|dwg|pdf|png|jpg|jpeg|f3d|skp|sldprt|ply|amf|zip)$');