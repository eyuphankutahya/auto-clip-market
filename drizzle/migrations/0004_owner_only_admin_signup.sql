CREATE TABLE public.admin_bootstrap (
  email text PRIMARY KEY,
  claimed_user_id uuid,
  claimed_at timestamptz,
  CONSTRAINT admin_bootstrap_email_normalized CHECK (email = lower(trim(email)))
);
GRANT ALL ON public.admin_bootstrap TO service_role;
ALTER TABLE public.admin_bootstrap ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.admin_bootstrap IS 'Service-managed verified owner allowlist. No browser access.';
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''));
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.claim_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_email text;
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;
  UPDATE public.admin_bootstrap SET claimed_user_id = NEW.id, claimed_at = now()
  WHERE email = lower(trim(NEW.email)) AND claimed_user_id IS NULL
  RETURNING email INTO owner_email;
  IF owner_email IS NOT NULL THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_owner_email_confirmed AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.claim_owner_admin();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_owner_admin() FROM PUBLIC, anon, authenticated;
CREATE UNIQUE INDEX customer_accounts_one_per_user ON public.customer_accounts(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.customer_accounts ADD CONSTRAINT customer_accounts_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id);
