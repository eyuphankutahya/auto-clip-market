CREATE OR REPLACE FUNCTION public.admin_period_analysis(_from timestamptz,_to timestamptz,_previous_from timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Yönetici yetkisi gerekli'; END IF;
 IF _from IS NULL OR _to IS NULL OR _previous_from IS NULL OR _from>=_to OR _previous_from>=_from OR (_to-_from)<>(_from-_previous_from) THEN RAISE EXCEPTION 'Geçersiz karşılaştırma dönemi'; END IF;
 WITH current_orders AS (SELECT * FROM public.orders WHERE created_at>=_from AND created_at<_to AND status IN ('approved','shipped')),
 previous_orders AS (SELECT * FROM public.orders WHERE created_at>=_previous_from AND created_at<_from AND status IN ('approved','shipped')),
 credits AS (SELECT * FROM public.account_transactions WHERE type='credit' AND created_at>=_from AND created_at<_to),
 customers AS (SELECT COALESCE(o.customer_account_id,o.user_id) id,COALESCE(c.company_name,NULLIF(p.full_name,''),p.email,'Silinmiş kullanıcı') name,count(*) orders,sum(o.total) revenue FROM current_orders o LEFT JOIN public.customer_accounts c ON c.id=o.customer_account_id LEFT JOIN public.profiles p ON p.id=o.user_id GROUP BY 1,2 ORDER BY revenue DESC LIMIT 20),
 products_sold AS (SELECT oi.product_id,COALESCE(p.sku,'—') sku,oi.product_name name,sum(oi.quantity) quantity,sum(oi.quantity*oi.unit_price) revenue FROM public.order_items oi JOIN current_orders o ON o.id=oi.order_id LEFT JOIN public.products p ON p.id=oi.product_id GROUP BY 1,2,3 ORDER BY revenue DESC LIMIT 20),
 accounts AS (SELECT c.id,c.company_name name,COALESCE(b.total_debit,0) debit,COALESCE(b.total_credit,0) credit,COALESCE(b.balance,0) balance FROM public.customer_accounts c LEFT JOIN public.account_balances b ON b.customer_account_id=c.id ORDER BY balance DESC,c.id LIMIT 20),
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
REVOKE ALL ON FUNCTION public.admin_period_analysis(timestamptz,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_period_analysis(timestamptz,timestamptz,timestamptz) TO authenticated,service_role;