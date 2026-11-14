ALTER TABLE public.product_supplier_codes DROP CONSTRAINT product_supplier_codes_product_id_supplier_id_key;
CREATE UNIQUE INDEX product_supplier_codes_unique_code ON public.product_supplier_codes (product_id, supplier_id, coalesce(code, ''));
CREATE OR REPLACE FUNCTION public.replace_product_supplier_codes(_product_id uuid, _codes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Yalnızca yönetici tedarikçi kodlarını değiştirebilir';
  END IF;
  IF jsonb_typeof(_codes) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Geçersiz tedarikçi kodları';
  END IF;
  PERFORM id FROM public.products WHERE id = _product_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ürün bulunamadı'; END IF;
  DELETE FROM public.product_supplier_codes WHERE product_id = _product_id;
  INSERT INTO public.product_supplier_codes (product_id, supplier_id, code)
  SELECT DISTINCT _product_id, (item->>'supplier_id')::uuid, nullif(trim(item->>'code'), '')
  FROM jsonb_array_elements(_codes) AS item;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_product_supplier_codes(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_product_supplier_codes(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_product_supplier_codes(uuid, jsonb) TO service_role;