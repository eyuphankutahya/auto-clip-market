CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN _user_id = auth.uid() OR auth.role() = 'service_role'
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
    THEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    ELSE false END
$$;
DROP POLICY IF EXISTS "Public read referenced product photos" ON storage.objects;
CREATE POLICY "Public read referenced product photos" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'product-photos' AND EXISTS (SELECT 1 FROM public.products p WHERE p.is_active AND storage.objects.name IN (p.image_url, p.image_original_url, p.image_thumbnail_url)));