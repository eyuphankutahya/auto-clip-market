CREATE TABLE public.admin_audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(),
 actor_id uuid, table_name text NOT NULL, record_id uuid, action text NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
 record_label text NOT NULL, before_data jsonb, after_data jsonb
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_audit_read ON public.admin_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX admin_audit_date_idx ON public.admin_audit_log(created_at DESC,id);
CREATE INDEX admin_audit_table_idx ON public.admin_audit_log(table_name,created_at DESC);
CREATE OR REPLACE FUNCTION public.capture_admin_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b jsonb; a jsonb; r jsonb; label text;
BEGIN
 IF TG_OP <> 'INSERT' THEN b := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN a := to_jsonb(NEW); END IF;
 IF TG_OP='UPDATE' AND (b - ARRAY['revision','updated_at']) IS NOT DISTINCT FROM (a - ARRAY['revision','updated_at']) THEN RETURN NEW; END IF;
 r := COALESCE(a,b);
 label := COALESCE(r->>'company_name',r->>'name',CASE WHEN r->>'order_no' IS NOT NULL THEN 'Sipariş #' || (r->>'order_no') END,r->>'code',r->>'oem',r->>'description',r->>'reason',r->>'id','');
 INSERT INTO public.admin_audit_log(actor_id,table_name,record_id,action,record_label,before_data,after_data)
 VALUES(auth.uid(),TG_TABLE_NAME,(r->>'id')::uuid,TG_OP,label,b,a);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.capture_admin_audit() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['products','orders','customer_accounts','account_transactions','purchases','suppliers','product_supplier_codes','product_oem_numbers','product_vehicles','categories','brands','vehicle_models','stock_adjustments'] LOOP
 EXECUTE format('CREATE TRIGGER admin_audit_capture AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_admin_audit()',t);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.admin_bulk_products(_items jsonb,_patch jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item record; p public.products; n integer :=0; minimum integer; maximum integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Yönetici yetkisi gerekli'; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items)<1 OR jsonb_array_length(_items)>100 THEN RAISE EXCEPTION '1 ile 100 ürün seçin'; END IF;
 IF jsonb_typeof(_patch) IS DISTINCT FROM 'object' OR _patch='{}'::jsonb THEN RAISE EXCEPTION 'Değişiklik seçin'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(_patch) k WHERE k NOT IN ('price','min_stock','max_stock','category_id','stock_alert_enabled')) THEN RAISE EXCEPTION 'Geçersiz alan'; END IF;
 IF _patch ? 'price' AND ((_patch->>'price') IS NULL OR (_patch->>'price')::numeric<0) THEN RAISE EXCEPTION 'Fiyat sıfır veya pozitif olmalı'; END IF;
 IF _patch ? 'stock_alert_enabled' AND jsonb_typeof(_patch->'stock_alert_enabled') <> 'boolean' THEN RAISE EXCEPTION 'Geçersiz uyarı tercihi'; END IF;
 IF _patch ? 'category_id' AND (_patch->>'category_id') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.categories WHERE id=(_patch->>'category_id')::uuid) THEN RAISE EXCEPTION 'Kullanım yeri bulunamadı'; END IF;
 IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(_items) x)<>jsonb_array_length(_items) THEN RAISE EXCEPTION 'Tekrarlanan ürün'; END IF;
 FOR item IN SELECT x FROM jsonb_array_elements(_items) x ORDER BY x->>'id' LOOP
  SELECT * INTO p FROM public.products WHERE id=(item.x->>'id')::uuid FOR UPDATE;
  IF NOT FOUND OR (item.x->>'revision') IS NULL OR p.revision<>(item.x->>'revision')::integer THEN RAISE EXCEPTION 'Ürün değişmiş veya silinmiş; listeyi yenileyin'; END IF;
  minimum:= CASE WHEN _patch ? 'min_stock' THEN (_patch->>'min_stock')::integer ELSE p.min_stock END;
  maximum:= CASE WHEN _patch ? 'max_stock' THEN (_patch->>'max_stock')::integer ELSE p.max_stock END;
  IF minimum IS NULL OR minimum<0 OR (maximum IS NOT NULL AND maximum<minimum) THEN RAISE EXCEPTION 'Geçersiz minimum/maksimum stok: %',p.sku; END IF;
  UPDATE public.products SET
   price=CASE WHEN _patch ? 'price' THEN (_patch->>'price')::numeric ELSE price END,
   min_stock=minimum,max_stock=maximum,
   category_id=CASE WHEN _patch ? 'category_id' THEN (_patch->>'category_id')::uuid ELSE category_id END,
   needs_review=CASE WHEN _patch ? 'category_id' THEN (_patch->>'category_id') IS NULL ELSE needs_review END,
   stock_alert_enabled=CASE WHEN _patch ? 'stock_alert_enabled' THEN (_patch->>'stock_alert_enabled')::boolean ELSE stock_alert_enabled END
  WHERE id=p.id;
  n:=n+1;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.admin_bulk_products(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_products(jsonb,jsonb) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_bulk_orders(_items jsonb,_target text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item record; o public.orders; n integer:=0;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Yönetici yetkisi gerekli'; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items)<1 OR jsonb_array_length(_items)>100 THEN RAISE EXCEPTION '1 ile 100 sipariş seçin'; END IF;
 IF _target IS NULL OR _target NOT IN ('approved','shipped','cancelled') THEN RAISE EXCEPTION 'Geçersiz durum'; END IF;
 IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(_items) x)<>jsonb_array_length(_items) THEN RAISE EXCEPTION 'Tekrarlanan sipariş'; END IF;
 PERFORM 1 FROM public.products WHERE id IN (SELECT oi.product_id FROM public.order_items oi JOIN jsonb_array_elements(_items) x ON oi.order_id=(x->>'id')::uuid) ORDER BY id FOR UPDATE;
 FOR item IN SELECT x FROM jsonb_array_elements(_items) x ORDER BY x->>'id' LOOP
  SELECT * INTO o FROM public.orders WHERE id=(item.x->>'id')::uuid FOR UPDATE;
  IF NOT FOUND OR o.status IS DISTINCT FROM item.x->>'status' THEN RAISE EXCEPTION 'Sipariş değişmiş veya silinmiş; listeyi yenileyin'; END IF;
  IF NOT ((_target='approved' AND o.status='pending') OR (_target='shipped' AND o.status='approved') OR (_target='cancelled' AND o.status IN ('pending','approved'))) THEN RAISE EXCEPTION 'Sipariş #% bu işleme uygun değil',o.order_no; END IF;
  UPDATE public.orders SET status=_target WHERE id=o.id;
  n:=n+1;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.admin_bulk_orders(jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_bulk_orders(jsonb,text) TO authenticated,service_role;