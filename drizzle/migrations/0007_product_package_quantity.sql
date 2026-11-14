ALTER TABLE public.products ADD COLUMN package_quantity integer;
ALTER TABLE public.products ADD CONSTRAINT products_package_quantity_positive CHECK (package_quantity IS NULL OR package_quantity > 0);
COMMENT ON COLUMN public.products.package_quantity IS 'Optional pieces per package for display only; order quantities and unit prices remain unchanged.';