ALTER TABLE public.products ADD COLUMN is_active boolean NOT NULL DEFAULT true;

CREATE TABLE public.customer_account_notes (
  customer_account_id uuid PRIMARY KEY REFERENCES public.customer_accounts(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_account_notes TO authenticated;
GRANT ALL ON public.customer_account_notes TO service_role;
ALTER TABLE public.customer_account_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin notes" ON public.customer_account_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
INSERT INTO public.customer_account_notes(customer_account_id, notes) SELECT id, notes FROM public.customer_accounts WHERE coalesce(notes,'') <> '';
UPDATE public.customer_accounts SET notes = NULL WHERE notes IS NOT NULL;
COMMENT ON COLUMN public.customer_accounts.notes IS 'DEPRECATED: write-only redirect; stored in customer_account_notes (admin-only)';
CREATE OR REPLACE FUNCTION public.redirect_account_notes() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.notes IS NULL THEN RETURN NEW; END IF;
  INSERT INTO customer_account_notes(customer_account_id, notes, updated_at) VALUES (NEW.id, NEW.notes, now())
    ON CONFLICT (customer_account_id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = now();
  IF TG_OP = 'UPDATE' THEN NEW.notes := NULL; RETURN NEW; END IF;
  UPDATE customer_accounts SET notes = NULL WHERE id = NEW.id;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.redirect_account_notes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER customer_accounts_notes_after_insert AFTER INSERT ON public.customer_accounts FOR EACH ROW EXECUTE FUNCTION public.redirect_account_notes();
CREATE TRIGGER customer_accounts_notes_before_update BEFORE UPDATE ON public.customer_accounts FOR EACH ROW EXECUTE FUNCTION public.redirect_account_notes();

CREATE OR REPLACE FUNCTION public.guard_active_order() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF OLD.status IN ('approved','shipped') AND (NEW.total IS DISTINCT FROM OLD.total OR NEW.discount_rate IS DISTINCT FROM OLD.discount_rate OR NEW.customer_account_id IS DISTINCT FROM OLD.customer_account_id OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'Onaylı siparişin tutarı/müşterisi değiştirilemez; önce siparişi iptal edin';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_guard_active BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.guard_active_order();
CREATE OR REPLACE FUNCTION public.guard_active_order_items() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders WHERE id = coalesce(NEW.order_id, OLD.order_id) AND status IN ('approved','shipped')) OR (TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM orders WHERE id = OLD.order_id AND status IN ('approved','shipped'))) THEN
    RAISE EXCEPTION 'Onaylı siparişin ürünleri değiştirilemez; önce siparişi iptal edin';
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER order_items_guard_active BEFORE INSERT OR UPDATE OR DELETE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.guard_active_order_items();
CREATE OR REPLACE FUNCTION public.guard_purchase_update() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.quantity IS DISTINCT FROM OLD.quantity THEN
    RAISE EXCEPTION 'Alım ürünü/adedi değiştirilemez; kaydı silip doğru alımı yeniden girin';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER purchases_guard_update BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.guard_purchase_update();

CREATE INDEX contact_submissions_email_created_idx ON public.contact_submissions (lower(email), created_at DESC);
CREATE INDEX contact_submissions_created_idx ON public.contact_submissions (created_at DESC);

DROP FUNCTION public.admin_period_analysis(timestamptz,timestamptz,timestamptz);
CREATE OR REPLACE FUNCTION public.admin_period_analysis(_from timestamptz,_to timestamptz,_previous_from timestamptz,_limit integer DEFAULT 20) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Yönetici yetkisi gerekli'; END IF;
 IF _from IS NULL OR _to IS NULL OR _previous_from IS NULL OR _from>=_to OR _previous_from>=_from OR (_to-_from)<>(_from-_previous_from) THEN RAISE EXCEPTION 'Geçersiz karşılaştırma dönemi'; END IF;
 WITH current_orders AS (SELECT * FROM public.orders WHERE created_at>=_from AND created_at<_to AND status IN ('approved','shipped')),
 previous_orders AS (SELECT * FROM public.orders WHERE created_at>=_previous_from AND created_at<_from AND status IN ('approved','shipped')),
 credits AS (SELECT * FROM public.account_transactions WHERE type='credit' AND created_at>=_from AND created_at<_to),
 customers AS (SELECT COALESCE(o.customer_account_id,o.user_id) id,COALESCE(c.company_name,NULLIF(p.full_name,''),p.email,'Silinmiş kullanıcı') name,count(*) orders,sum(o.total) revenue FROM current_orders o LEFT JOIN public.customer_accounts c ON c.id=o.customer_account_id LEFT JOIN public.profiles p ON p.id=o.user_id GROUP BY 1,2 ORDER BY revenue DESC LIMIT _limit),
 products_sold AS (SELECT oi.product_id,COALESCE(p.sku,'—') sku,oi.product_name name,sum(oi.quantity) quantity,sum(oi.quantity*oi.unit_price) revenue FROM public.order_items oi JOIN current_orders o ON o.id=oi.order_id LEFT JOIN public.products p ON p.id=oi.product_id GROUP BY 1,2,3 ORDER BY revenue DESC LIMIT _limit),
 accounts AS (SELECT c.id,c.company_name name,COALESCE(b.total_debit,0) debit,COALESCE(b.total_credit,0) credit,COALESCE(b.balance,0) balance FROM public.customer_accounts c LEFT JOIN public.account_balances b ON b.customer_account_id=c.id ORDER BY balance DESC,c.id LIMIT _limit),
 daily AS (SELECT to_char(created_at AT TIME ZONE 'Europe/Istanbul','YYYY-MM-DD') AS date_key,sum(total) total FROM current_orders GROUP BY 1 ORDER BY 1),
 methods AS (SELECT COALESCE(payment_method,'Belirtilmedi') method,sum(amount) amount FROM credits GROUP BY 1 ORDER BY amount DESC)
 SELECT jsonb_build_object(
 'revenue',COALESCE((SELECT sum(total) FROM current_orders),0),'previous_revenue',COALESCE((SELECT sum(total) FROM previous_orders),0),
 'order_count',(SELECT count(*) FROM current_orders),'quantity',COALESCE((SELECT sum(oi.quantity) FROM public.order_items oi JOIN current_orders o ON o.id=oi.order_id),0),
 'payments',COALESCE((SELECT sum(amount) FROM credits),0),'previous_payments',COALESCE((SELECT sum(amount) FROM public.account_transactions WHERE type='credit' AND created_at>=_previous_from AND created_at<_from),0),
 'receivable',COALESCE((SELECT sum(greatest(balance,0)) FROM public.account_balances),0),'customer_count',(SELECT count(DISTINCT COALESCE(customer_account_id,user_id)) FROM current_orders),
 'customers',COALESCE((SELECT jsonb_agg(to_jsonb(customers)) FROM customers),'[]'::jsonb),'products',COALESCE((SELECT jsonb_agg(to_jsonb(products_sold)) FROM products_sold),'[]'::jsonb),
 'accounts',COALESCE((SELECT jsonb_agg(to_jsonb(accounts)) FROM accounts),'[]'::jsonb),'daily',COALESCE((SELECT jsonb_agg(to_jsonb(daily)) FROM daily),'[]'::jsonb),'methods',COALESCE((SELECT jsonb_agg(to_jsonb(methods)) FROM methods),'[]'::jsonb)
 ) INTO result; RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_period_analysis(timestamptz,timestamptz,timestamptz,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_period_analysis(timestamptz,timestamptz,timestamptz,integer) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.catalog_page(_q text DEFAULT '', _category text DEFAULT '', _brand text DEFAULT '', _model text DEFAULT '', _page integer DEFAULT 1, _slug text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE result jsonb; total_count integer; page_no integer; BEGIN
IF length(_q)>200 OR _page<1 OR _page>100000 THEN RAISE EXCEPTION 'Geçersiz filtre'; END IF;
WITH filtered AS (SELECT p.id FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.is_active AND (_slug='' OR p.slug=_slug) AND (_category='' OR c.slug=_category) AND (_brand='' OR EXISTS (SELECT 1 FROM product_vehicles v JOIN brands b ON b.id=v.brand_id WHERE v.product_id=p.id AND b.slug=_brand)) AND (_model='' OR EXISTS (SELECT 1 FROM product_vehicles v JOIN brands b ON b.id=v.brand_id WHERE v.product_id=p.id AND (v.model_id::text=_model OR (v.model_id IS NULL AND b.slug=_brand)))) AND (catalog_norm(_q)='' OR catalog_norm(p.sku)=catalog_norm(_q) OR position(catalog_norm(_q) IN catalog_norm(p.name))>0 OR EXISTS (SELECT 1 FROM product_oem_numbers o WHERE o.product_id=p.id AND position(catalog_norm(_q) IN catalog_norm(o.oem))>0))) SELECT count(*) INTO total_count FROM filtered;
page_no:=least(_page,greatest(1,ceil(total_count/24.0)::int));
WITH filtered AS (SELECT p.* FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.is_active AND (_slug='' OR p.slug=_slug) AND (_category='' OR c.slug=_category) AND (_brand='' OR EXISTS (SELECT 1 FROM product_vehicles v JOIN brands b ON b.id=v.brand_id WHERE v.product_id=p.id AND b.slug=_brand)) AND (_model='' OR EXISTS (SELECT 1 FROM product_vehicles v JOIN brands b ON b.id=v.brand_id WHERE v.product_id=p.id AND (v.model_id::text=_model OR (v.model_id IS NULL AND b.slug=_brand)))) AND (catalog_norm(_q)='' OR catalog_norm(p.sku)=catalog_norm(_q) OR position(catalog_norm(_q) IN catalog_norm(p.name))>0 OR EXISTS (SELECT 1 FROM product_oem_numbers o WHERE o.product_id=p.id AND position(catalog_norm(_q) IN catalog_norm(o.oem))>0)) ORDER BY nullif(btrim(p.sku),'') COLLATE public.km_natural NULLS LAST,p.id LIMIT 24 OFFSET (page_no-1)*24), rows AS (SELECT to_jsonb(p)-'revision' || jsonb_build_object('category',(SELECT jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug) FROM categories c WHERE c.id=p.category_id),'oems',coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'oem',o.oem)) FROM product_oem_numbers o WHERE o.product_id=p.id),'[]'::jsonb),'vehicles',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'brand_id',v.brand_id,'model_id',v.model_id,'brand',jsonb_build_object('name',b.name,'slug',b.slug),'model',CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object('name',m.name) END)) FROM product_vehicles v JOIN brands b ON b.id=v.brand_id LEFT JOIN vehicle_models m ON m.id=v.model_id WHERE v.product_id=p.id),'[]'::jsonb)) AS item, p.sku,p.id FROM filtered p) SELECT coalesce(jsonb_agg(item ORDER BY nullif(btrim(sku),'') COLLATE public.km_natural NULLS LAST,id),'[]'::jsonb) INTO result FROM rows;
RETURN jsonb_build_object('products',result,'total',total_count,'page',page_no); END $$;

CREATE OR REPLACE FUNCTION public.hide_rolled_back_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.rolled_back_at IS NOT NULL AND OLD.rolled_back_at IS NULL THEN
    UPDATE products SET is_active = false WHERE id IN (SELECT product_id FROM import_items WHERE batch_id = NEW.id AND was_created);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.hide_rolled_back_created() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER import_batches_hide_created AFTER UPDATE ON public.import_batches FOR EACH ROW EXECUTE FUNCTION public.hide_rolled_back_created();