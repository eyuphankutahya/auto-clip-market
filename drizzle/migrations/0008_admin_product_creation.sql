CREATE OR REPLACE FUNCTION public.create_admin_product(
  _product jsonb,
  _oems jsonb,
  _vehicles jsonb,
  _supplier_codes jsonb,
  _initial_stock integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Yalnızca yönetici ürün ekleyebilir';
  END IF;
  IF jsonb_typeof(_product) IS DISTINCT FROM 'object'
    OR jsonb_typeof(_oems) IS DISTINCT FROM 'array'
    OR jsonb_typeof(_vehicles) IS DISTINCT FROM 'array'
    OR jsonb_typeof(_supplier_codes) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Geçersiz ürün bilgileri';
  END IF;
  IF nullif(trim(_product->>'name'), '') IS NULL THEN
    RAISE EXCEPTION 'Ürün adı zorunludur';
  END IF;
  IF _initial_stock < 0 THEN
    RAISE EXCEPTION 'Açılış stoğu sıfırdan küçük olamaz';
  END IF;

  INSERT INTO public.products (
    sku, name, slug, description, image_url, price, stock,
    min_stock, max_stock, package_quantity, category_id, needs_review
  ) VALUES (
    nullif(trim(_product->>'sku'), ''),
    trim(_product->>'name'),
    nullif(trim(_product->>'slug'), ''),
    nullif(trim(_product->>'description'), ''),
    nullif(trim(_product->>'image_url'), ''),
    coalesce((_product->>'price')::numeric, 0),
    0,
    coalesce((_product->>'min_stock')::integer, 50),
    nullif(_product->>'max_stock', '')::integer,
    nullif(_product->>'package_quantity', '')::integer,
    nullif(_product->>'category_id', '')::uuid,
    nullif(_product->>'category_id', '') IS NULL
  )
  RETURNING id INTO _id;

  INSERT INTO public.product_oem_numbers (product_id, oem)
  SELECT DISTINCT _id, trim(value)
  FROM jsonb_array_elements_text(_oems)
  WHERE trim(value) <> '';

  INSERT INTO public.product_vehicles (product_id, brand_id, model_id)
  SELECT DISTINCT _id, (item->>'brand_id')::uuid, nullif(item->>'model_id', '')::uuid
  FROM jsonb_array_elements(_vehicles) AS item;

  INSERT INTO public.product_supplier_codes (product_id, supplier_id, code)
  SELECT DISTINCT _id, (item->>'supplier_id')::uuid, nullif(trim(item->>'code'), '')
  FROM jsonb_array_elements(_supplier_codes) AS item;

  INSERT INTO public.stock_adjustments (product_id, new_stock, reason, created_by)
  VALUES (_id, _initial_stock, 'Yeni ürün açılış stoğu', auth.uid());

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_product(jsonb, jsonb, jsonb, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_product(jsonb, jsonb, jsonb, jsonb, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_product(jsonb, jsonb, jsonb, jsonb, integer) TO service_role;