CREATE TABLE public.shop_state (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, INSERT, UPDATE ON public.shop_state TO authenticated;
GRANT ALL ON public.shop_state TO service_role;
ALTER TABLE public.shop_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in team can read" ON public.shop_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Signed-in team can insert" ON public.shop_state FOR INSERT TO authenticated WITH CHECK (id = 'main');
CREATE POLICY "Signed-in team can update" ON public.shop_state FOR UPDATE TO authenticated USING (id = 'main') WITH CHECK (id = 'main');
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_state;