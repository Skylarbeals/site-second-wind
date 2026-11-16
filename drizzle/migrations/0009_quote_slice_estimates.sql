ALTER TABLE public.quote_requests
  ADD COLUMN slice_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN slice_grams integer,
  ADD COLUMN slice_seconds integer,
  ADD COLUMN slice_error text,
  ADD COLUMN slice_updated_at timestamptz;
UPDATE public.quote_requests SET slice_status = 'skipped' WHERE status <> 'new';