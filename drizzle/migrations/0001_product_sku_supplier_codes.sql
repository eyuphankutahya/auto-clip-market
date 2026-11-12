ALTER TABLE public.products ADD COLUMN sku text UNIQUE;
ALTER TABLE public.products ADD COLUMN needs_review boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.products.sku IS 'KlipsMarket product number shown to customers';

CREATE TABLE public.product_supplier_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  code text,
  UNIQUE (product_id, supplier_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_supplier_codes TO authenticated;
GRANT ALL ON public.product_supplier_codes TO service_role;
ALTER TABLE public.product_supplier_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin only" ON public.product_supplier_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX ON public.product_supplier_codes(product_id);

CREATE OR REPLACE FUNCTION public.place_order(_items jsonb, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare _uid uuid := auth.uid(); _acc customer_accounts; _oid uuid; _rate numeric := 0; _total numeric := 0; it jsonb; p products; _q int; _price numeric;
begin
  if _uid is null then raise exception 'Giriş gerekli'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Sepet boş'; end if;
  select * into _acc from customer_accounts where user_id = _uid;
  if found then _rate := _acc.discount_rate; end if;
  insert into orders(user_id, customer_account_id, discount_rate, notes) values (_uid, _acc.id, _rate, _notes) returning id into _oid;
  for it in select * from jsonb_array_elements(_items) loop
    _q := (it->>'quantity')::int;
    if _q is null or _q <= 0 then raise exception 'Geçersiz adet'; end if;
    select * into p from products where id = (it->>'product_id')::uuid;
    if not found then raise exception 'Ürün bulunamadı'; end if;
    if p.price is null or p.price <= 0 then raise exception 'Fiyatı henüz belirlenmemiş ürün sipariş edilemez: %', p.name; end if;
    _price := round(p.price * (1 - _rate/100), 2);
    insert into order_items(order_id, product_id, product_name, quantity, unit_price) values (_oid, p.id, p.name, _q, _price);
    _total := _total + _price * _q;
  end loop;
  update orders set total = _total where id = _oid;
  return _oid;
end $function$;