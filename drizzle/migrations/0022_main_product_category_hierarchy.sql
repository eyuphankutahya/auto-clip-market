ALTER TABLE public.categories ADD COLUMN parent_id uuid;
ALTER TABLE public.categories ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE RESTRICT;
ALTER TABLE public.categories ADD CONSTRAINT categories_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);
CREATE INDEX categories_parent_id_idx ON public.categories(parent_id);
COMMENT ON COLUMN public.categories.parent_id IS 'Ana ürün grubu; boş ise kayıt ana gruptur. En fazla iki seviye kullanılır.';
COMMENT ON TABLE public.vehicle_models IS 'DEPRECATED: araç modelleri kullanılmıyor; katalog ve yönetim yalnızca araç markalarını kullanır.';
COMMENT ON COLUMN public.product_vehicles.model_id IS 'DEPRECATED: yeni kayıtlar yalnızca brand_id kullanır; eski veri korunur.';

CREATE OR REPLACE FUNCTION public.guard_category_hierarchy() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE parent_row record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.parent_id IS NULL AND OLD.slug IN ('klips','soket','jant-kapagi','celik-jant-gobekleri','oto-bakim-malzemeleri-kimyasallari') THEN
      RAISE EXCEPTION 'Ana ürün grupları silinemez';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS NULL AND OLD.slug IN ('klips','soket','jant-kapagi','celik-jant-gobekleri','oto-bakim-malzemeleri-kimyasallari') AND (NEW.parent_id IS NOT NULL OR NEW.slug <> OLD.slug) THEN
    RAISE EXCEPTION 'Ana ürün grubunun bağlantısı ve adresi değiştirilemez';
  END IF;
  IF NEW.parent_id IS NOT NULL THEN
    SELECT id, parent_id INTO parent_row FROM public.categories WHERE id = NEW.parent_id;
    IF NOT FOUND OR parent_row.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Alt kategori yalnızca bir ana ürün grubuna bağlanabilir';
    END IF;
    IF TG_OP = 'UPDATE' AND EXISTS (SELECT 1 FROM public.categories WHERE parent_id = NEW.id) THEN
      RAISE EXCEPTION 'Alt kategorisi olan ana grup başka bir gruba bağlanamaz';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER categories_hierarchy_guard BEFORE INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.guard_category_hierarchy();

CREATE OR REPLACE FUNCTION public.catalog_page(_q text DEFAULT '', _category text DEFAULT '', _brand text DEFAULT '', _model text DEFAULT '', _page integer DEFAULT 1, _slug text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public AS $$
DECLARE result jsonb; total_count integer; page_no integer; BEGIN
IF length(_q)>200 OR _page<1 OR _page>100000 THEN RAISE EXCEPTION 'Geçersiz filtre'; END IF;
WITH filtered AS (
  SELECT p.id FROM products p
  LEFT JOIN categories c ON c.id=p.category_id
  LEFT JOIN categories parent ON parent.id=c.parent_id
  WHERE p.is_active
    AND (_slug='' OR p.slug=_slug)
    AND (_category='' OR c.slug=_category OR parent.slug=_category)
    AND (_brand='' OR EXISTS (SELECT 1 FROM product_vehicles v JOIN brands b ON b.id=v.brand_id WHERE v.product_id=p.id AND b.slug=_brand))
    AND (catalog_norm(_q)='' OR catalog_norm(p.sku)=catalog_norm(_q) OR position(catalog_norm(_q) IN catalog_norm(p.name))>0 OR EXISTS (SELECT 1 FROM product_oem_numbers o WHERE o.product_id=p.id AND position(catalog_norm(_q) IN catalog_norm(o.oem))>0))
) SELECT count(*) INTO total_count FROM filtered;
page_no:=least(_page,greatest(1,ceil(total_count/24.0)::int));
WITH filtered AS (
  SELECT p.* FROM products p
  LEFT JOIN categories c ON c.id=p.category_id
  LEFT JOIN categories parent ON parent.id=c.parent_id
  WHERE p.is_active
    AND (_slug='' OR p.slug=_slug)
    AND (_category='' OR c.slug=_category OR parent.slug=_category)
    AND (_brand='' OR EXISTS (SELECT 1 FROM product_vehicles v JOIN brands b ON b.id=v.brand_id WHERE v.product_id=p.id AND b.slug=_brand))
    AND (catalog_norm(_q)='' OR catalog_norm(p.sku)=catalog_norm(_q) OR position(catalog_norm(_q) IN catalog_norm(p.name))>0 OR EXISTS (SELECT 1 FROM product_oem_numbers o WHERE o.product_id=p.id AND position(catalog_norm(_q) IN catalog_norm(o.oem))>0))
  ORDER BY nullif(btrim(p.sku),'') COLLATE public.km_natural NULLS LAST,p.id LIMIT 24 OFFSET (page_no-1)*24
), rows AS (
  SELECT to_jsonb(p)-'revision' || jsonb_build_object(
    'category',(SELECT jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'parent_id',c.parent_id) FROM categories c WHERE c.id=p.category_id),
    'oems',coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'oem',o.oem)) FROM product_oem_numbers o WHERE o.product_id=p.id),'[]'::jsonb),
    'vehicles',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'brand_id',v.brand_id,'brand',jsonb_build_object('name',b.name,'slug',b.slug))) FROM product_vehicles v JOIN brands b ON b.id=v.brand_id WHERE v.product_id=p.id),'[]'::jsonb)
  ) AS item, p.sku,p.id FROM filtered p
) SELECT coalesce(jsonb_agg(item ORDER BY nullif(btrim(sku),'') COLLATE public.km_natural NULLS LAST,id),'[]'::jsonb) INTO result FROM rows;
RETURN jsonb_build_object('products',result,'total',total_count,'page',page_no); END $$;
COMMENT ON FUNCTION public.catalog_page(text,text,text,text,integer,text) IS 'Sayfalı katalog; _category ana grup veya alt kategori olabilir. _model yalnızca geriye dönük imza uyumluluğu için tutulur ve kullanılmaz.';
REVOKE ALL ON FUNCTION public.catalog_page(text,text,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_page(text,text,text,text,integer,text) TO anon,authenticated,service_role;