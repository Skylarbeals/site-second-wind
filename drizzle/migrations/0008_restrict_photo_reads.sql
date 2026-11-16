DROP POLICY IF EXISTS "Anyone reads product photos" ON storage.objects;
CREATE POLICY "Admins read product photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Public reads review photos" ON storage.objects;
CREATE POLICY "Read photos attached to reviews" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'review-photos' AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.photo_path = storage.objects.name));
CREATE POLICY "Owners and team read review photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'review-photos' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));