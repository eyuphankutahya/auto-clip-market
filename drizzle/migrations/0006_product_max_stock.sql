ALTER TABLE public.products ADD COLUMN max_stock integer;
ALTER TABLE public.products ADD CONSTRAINT products_max_stock_valid CHECK (max_stock IS NULL OR (max_stock >= 0 AND max_stock >= min_stock));
COMMENT ON COLUMN public.products.max_stock IS 'Optional upper inventory target; does not prevent stock receipts or adjustments.';