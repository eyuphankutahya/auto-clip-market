CREATE TABLE public.stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  new_stock integer NOT NULL CHECK (new_stock >= 0),
  previous_stock integer,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_adjustments TO authenticated;
GRANT ALL ON public.stock_adjustments TO service_role;
ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin stock adjustments" ON public.stock_adjustments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX stock_adjustments_product_idx ON public.stock_adjustments(product_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_stock_adjustment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT stock INTO NEW.previous_stock FROM products WHERE id = NEW.product_id;
  NEW.created_by := COALESCE(NEW.created_by, auth.uid());
  UPDATE products SET stock = NEW.new_stock WHERE id = NEW.product_id;
  RETURN NEW;
END $$;
CREATE TRIGGER stock_adjustments_apply BEFORE INSERT ON public.stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_adjustment();

-- Backfill: opening stock of 100 for every existing product.
INSERT INTO public.stock_adjustments (product_id, new_stock, reason)
SELECT id, 100, 'Açılış stoğu' FROM public.products;