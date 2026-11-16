ALTER TABLE public.filaments ADD COLUMN colors jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.inventory_items ADD COLUMN colors jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.filaments SET colors = jsonb_build_array(jsonb_build_object('name', color, 'hex', coalesce(color_hex,'#f97316'), 'in_stock', in_stock)) WHERE colors = '[]'::jsonb;