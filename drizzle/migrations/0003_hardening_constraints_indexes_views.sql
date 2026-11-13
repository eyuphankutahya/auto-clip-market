-- 1) Data integrity: value constraints
ALTER TABLE public.products ADD CONSTRAINT products_price_nonneg CHECK (price >= 0),
  ADD CONSTRAINT products_stock_nonneg CHECK (stock >= 0),
  ADD CONSTRAINT products_min_stock_nonneg CHECK (min_stock >= 0);
ALTER TABLE public.orders ADD CONSTRAINT orders_status_valid CHECK (status IN ('pending','approved','shipped','cancelled')),
  ADD CONSTRAINT orders_discount_range CHECK (discount_rate BETWEEN 0 AND 100),
  ADD CONSTRAINT orders_total_nonneg CHECK (total >= 0);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_qty_pos CHECK (quantity > 0),
  ADD CONSTRAINT order_items_price_nonneg CHECK (unit_price >= 0);
ALTER TABLE public.account_transactions ADD CONSTRAINT account_tx_type_valid CHECK (type IN ('debit','credit')),
  ADD CONSTRAINT account_tx_amount_pos CHECK (amount > 0);
ALTER TABLE public.customer_accounts ADD CONSTRAINT customer_accounts_discount_range CHECK (discount_rate BETWEEN 0 AND 100);
ALTER TABLE public.purchases ADD CONSTRAINT purchases_qty_pos CHECK (quantity > 0),
  ADD CONSTRAINT purchases_cost_nonneg CHECK (unit_cost >= 0);

-- 2) Indexes on foreign keys and common filters
CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_account_idx ON public.orders(customer_account_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS account_tx_account_idx ON public.account_transactions(customer_account_id);
CREATE INDEX IF NOT EXISTS account_tx_order_idx ON public.account_transactions(order_id);
CREATE INDEX IF NOT EXISTS customer_accounts_user_idx ON public.customer_accounts(user_id);
CREATE INDEX IF NOT EXISTS product_oem_product_idx ON public.product_oem_numbers(product_id);
CREATE INDEX IF NOT EXISTS product_oem_oem_idx ON public.product_oem_numbers(oem);
CREATE INDEX IF NOT EXISTS product_vehicles_product_idx ON public.product_vehicles(product_id);
CREATE INDEX IF NOT EXISTS product_vehicles_brand_idx ON public.product_vehicles(brand_id);
CREATE INDEX IF NOT EXISTS product_vehicles_model_idx ON public.product_vehicles(model_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS vehicle_models_brand_idx ON public.vehicle_models(brand_id);
CREATE INDEX IF NOT EXISTS purchases_product_idx ON public.purchases(product_id);
CREATE INDEX IF NOT EXISTS purchases_supplier_idx ON public.purchases(supplier_id);

-- 3) First-admin bootstrap: serialize so two simultaneous signups cannot both become admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('klipsmarket_first_admin'));
  INSERT INTO public.profiles(id, email, full_name) VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''));
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user');
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;

-- 4) place_order: input bounds + stock check (prices still computed here)
CREATE OR REPLACE FUNCTION public.place_order(_items jsonb, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _acc customer_accounts; _oid uuid; _rate numeric := 0; _total numeric := 0; it record; p products; _price numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Giriş gerekli'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'Sepet boş'; END IF;
  IF jsonb_array_length(_items) > 500 THEN RAISE EXCEPTION 'Bir siparişte en fazla 500 kalem olabilir'; END IF;
  IF length(COALESCE(_notes,'')) > 2000 THEN RAISE EXCEPTION 'Not en fazla 2000 karakter olabilir'; END IF;
  SELECT * INTO _acc FROM customer_accounts WHERE user_id = _uid;
  IF FOUND THEN _rate := _acc.discount_rate; END IF;
  INSERT INTO orders(user_id, customer_account_id, discount_rate, notes) VALUES (_uid, _acc.id, _rate, NULLIF(trim(_notes),'')) RETURNING id INTO _oid;
  -- merge duplicate lines of the same product
  FOR it IN SELECT (e->>'product_id')::uuid AS product_id, SUM((e->>'quantity')::int) AS quantity
            FROM jsonb_array_elements(_items) e GROUP BY 1 LOOP
    IF it.quantity IS NULL OR it.quantity <= 0 OR it.quantity > 100000 THEN RAISE EXCEPTION 'Geçersiz adet'; END IF;
    SELECT * INTO p FROM products WHERE id = it.product_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ürün bulunamadı'; END IF;
    IF p.price IS NULL OR p.price <= 0 THEN RAISE EXCEPTION 'Fiyatı henüz belirlenmemiş ürün sipariş edilemez: %', p.name; END IF;
    IF p.stock < it.quantity THEN RAISE EXCEPTION 'Stokta yeterli ürün yok: % (en fazla % adet)', p.name, p.stock; END IF;
    _price := round(p.price * (1 - _rate/100), 2);
    INSERT INTO order_items(order_id, product_id, product_name, quantity, unit_price) VALUES (_oid, p.id, p.name, it.quantity, _price);
    _total := _total + _price * it.quantity;
  END LOOP;
  UPDATE orders SET total = _total WHERE id = _oid;
  RETURN _oid;
END $$;

-- 5) Order approval: lock stock rows, refuse if insufficient, handle repeated product lines correctly
CREATE OR REPLACE FUNCTION public.order_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE was_active boolean := OLD.status IN ('approved','shipped'); is_active boolean := NEW.status IN ('approved','shipped'); _short record;
BEGIN
  IF is_active AND NOT was_active THEN
    PERFORM 1 FROM products WHERE id IN (SELECT product_id FROM order_items WHERE order_id = NEW.id) FOR UPDATE;
    SELECT p.name, p.stock, SUM(oi.quantity) AS q INTO _short
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id GROUP BY p.id, p.name, p.stock HAVING p.stock < SUM(oi.quantity) LIMIT 1;
    IF FOUND THEN RAISE EXCEPTION 'Yetersiz stok: % (stok %, sipariş %)', _short.name, _short.stock, _short.q; END IF;
    UPDATE products p SET stock = p.stock - x.q
      FROM (SELECT product_id, SUM(quantity) q FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL GROUP BY 1) x
      WHERE p.id = x.product_id;
    IF NEW.customer_account_id IS NOT NULL AND NEW.total > 0 THEN
      INSERT INTO account_transactions(customer_account_id, type, amount, description, order_id)
      VALUES (NEW.customer_account_id, 'debit', NEW.total, 'Sipariş #' || NEW.order_no, NEW.id);
    END IF;
  ELSIF was_active AND NOT is_active THEN
    UPDATE products p SET stock = p.stock + x.q
      FROM (SELECT product_id, SUM(quantity) q FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL GROUP BY 1) x
      WHERE p.id = x.product_id;
    DELETE FROM account_transactions WHERE order_id = NEW.id AND type = 'debit';
  END IF;
  RETURN NEW;
END $$;

-- 6) Least privilege on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.purchase_stock() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_stock_adjustment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 7) Aggregations in the database (respect RLS of the caller)
CREATE VIEW public.account_balances WITH (security_invoker = true) AS
  SELECT customer_account_id,
         SUM(CASE WHEN type = 'debit' THEN amount ELSE -amount END) AS balance,
         SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) AS total_debit,
         SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_credit
  FROM public.account_transactions GROUP BY customer_account_id;
GRANT SELECT ON public.account_balances TO authenticated;
GRANT SELECT ON public.account_balances TO service_role;

CREATE VIEW public.product_sales WITH (security_invoker = true) AS
  SELECT oi.product_id, SUM(oi.quantity)::bigint AS quantity, SUM(oi.quantity * oi.unit_price) AS revenue
  FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
  WHERE o.status IN ('approved','shipped') AND oi.product_id IS NOT NULL
  GROUP BY oi.product_id;
GRANT SELECT ON public.product_sales TO authenticated;
GRANT SELECT ON public.product_sales TO service_role;