ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_alert_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_alert_threshold integer;
ALTER TABLE public.products ADD CONSTRAINT products_stock_alert_threshold_check CHECK (stock_alert_threshold IS NULL OR stock_alert_threshold >= 0);
COMMENT ON COLUMN public.products.stock_alert_threshold IS 'Admin warning level; NULL means use min_stock';