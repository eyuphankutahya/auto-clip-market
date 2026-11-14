REVOKE ALL ON public.contact_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;