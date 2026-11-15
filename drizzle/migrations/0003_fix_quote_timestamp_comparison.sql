CREATE OR REPLACE FUNCTION public.accept_quote_into_shop(request_id uuid, expected_updated_at timestamptz, next_store jsonb, next_order_id text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE shop_saved_at timestamptz; quote_status text;
BEGIN
IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
SELECT updated_at INTO shop_saved_at FROM public.shop_state WHERE id='main' FOR UPDATE;
IF shop_saved_at IS DISTINCT FROM expected_updated_at THEN RAISE EXCEPTION 'Shop changed'; END IF;
SELECT status INTO quote_status FROM public.quote_requests WHERE id=request_id FOR UPDATE;
IF quote_status IS NULL OR quote_status='closed' THEN RAISE EXCEPTION 'Request unavailable'; END IF;
IF next_order_id IS DISTINCT FROM 'quote-' || request_id::text OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(next_store->'orders') o WHERE o->>'id'=next_order_id) THEN RAISE EXCEPTION 'Invalid order'; END IF;
UPDATE public.shop_state SET data=next_store,updated_at=now(),updated_by=auth.uid() WHERE id='main';
UPDATE public.quote_requests SET status='quoted',order_id=next_order_id WHERE id=request_id;
END; $$;