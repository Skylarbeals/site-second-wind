CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  author_name text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 80),
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Customers post own review" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (photo_path IS NULL OR photo_path LIKE auth.uid()::text || '/%'));
CREATE POLICY "Team deletes reviews" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public reads review photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'review-photos');
CREATE POLICY "Customers upload own review photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'review-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Team deletes review photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'review-photos' AND public.has_role(auth.uid(), 'admin'));