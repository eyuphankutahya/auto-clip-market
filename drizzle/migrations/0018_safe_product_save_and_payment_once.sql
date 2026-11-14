ALTER TABLE public.account_transactions ADD COLUMN request_key uuid;
CREATE UNIQUE INDEX account_transactions_request_key_unique ON public.account_transactions(request_key) WHERE request_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_save_product(_id uuid, _expected_revision bigint, _product jsonb, _stock integer, _oems jsonb, _vehicles jsonb, _codes jsonb)
RETURNS bigint LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE cur record; new_rev bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Yalnızca yönetici ürün düzenleyebilir'; END IF;
  IF _stock IS NULL OR _stock < 0 THEN RAISE EXCEPTION 'Stok sıfır veya pozitif tam sayı olmalı'; END IF;
  IF jsonb_typeof(_oems) <> 'array' OR jsonb_typeof(_vehicles) <> 'array' OR jsonb_typeof(_codes) <> 'array' THEN RAISE EXCEPTION 'Geçersiz ürün bilgisi'; END IF;
  SELECT id, revision, stock INTO cur FROM public.products WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ürün bulunamadı'; END IF;
  IF cur.revision <> _expected_revision THEN RAISE EXCEPTION 'STALE_PRODUCT: Ürün siz düzenlerken değişti; lütfen yenileyip tekrar deneyin'; END IF;
  UPDATE public.products SET
    sku = nullif(btrim(_product->>'sku'), ''),
    name = _product->>'name',
    slug = _product->>'slug',
    description = nullif(_product->>'description', ''),
    price = coalesce((_product->>'price')::numeric, 0),
    package_quantity = (_product->>'package_quantity')::integer,
    min_stock = (_product->>'min_stock')::integer,
    max_stock = (_product->>'max_stock')::integer,
    category_id = nullif(_product->>'category_id', '')::uuid,
    image_url = nullif(_product->>'image_url', ''),
    image_original_url = nullif(_product->>'image_original_url', ''),
    image_thumbnail_url = nullif(_product->>'image_thumbnail_url', ''),
    needs_review = coalesce((_product->>'needs_review')::boolean, false)
  WHERE id = _id;
  IF _stock <> cur.stock THEN
    INSERT INTO public.stock_adjustments(product_id, new_stock, previous_stock, reason) VALUES (_id, _stock, cur.stock, 'Ürün düzenleme ekranından stok düzeltme');
  END IF;
  DELETE FROM public.product_oem_numbers WHERE product_id = _id;
  INSERT INTO public.product_oem_numbers(product_id, oem)
    SELECT DISTINCT _id, btrim(x) FROM jsonb_array_elements_text(_oems) x WHERE btrim(x) <> '';
  DELETE FROM public.product_vehicles WHERE product_id = _id;
  INSERT INTO public.product_vehicles(product_id, brand_id, model_id)
    SELECT DISTINCT _id, (v->>'brand_id')::uuid, nullif(v->>'model_id','')::uuid FROM jsonb_array_elements(_vehicles) v;
  PERFORM public.replace_product_supplier_codes(_id, _codes);
  SELECT revision INTO new_rev FROM public.products WHERE id = _id;
  RETURN new_rev;
END $$;
REVOKE ALL ON FUNCTION public.admin_save_product(uuid, bigint, jsonb, integer, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_save_product(uuid, bigint, jsonb, integer, jsonb, jsonb, jsonb) TO authenticated, service_role;