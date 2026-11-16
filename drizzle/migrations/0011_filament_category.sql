ALTER TABLE public.filaments ADD COLUMN category text NOT NULL DEFAULT 'basic';
ALTER TABLE public.filaments ADD CONSTRAINT filaments_category_check CHECK (category IN ('basic','advanced'));