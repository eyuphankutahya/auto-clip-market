-- Lovable schema handoff. Requires the existing purchases, audit and product revision migrations.
begin;

create table public.supplier_orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity unique,
  supplier_id uuid not null references public.suppliers(id),
  supplier_name text not null,
  state text not null default 'draft' check (state in ('draft','ordered','closed','cancelled')),
  expected_date date check (isfinite(expected_date)),
  notes text not null default '',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  revision integer not null default 0
);
create index supplier_orders_supplier_idx on public.supplier_orders (supplier_id, order_no desc);

create table public.supplier_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supplier_orders(id),
  product_id uuid not null references public.products(id),
  sku text,
  product_name text not null,
  supplier_code text,
  ordered_qty integer not null check (ordered_qty > 0),
  expected_cost numeric(12,2) check (expected_cost >= 0),
  unique (order_id, product_id)
);

create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no bigint generated always as identity unique,
  order_id uuid not null references public.supplier_orders(id),
  supplier_id uuid not null references public.suppliers(id),
  document_no text not null,
  document_key text not null,
  document_date date not null check (isfinite(document_date)),
  document_year integer not null,
  received_date date not null check (isfinite(received_date)),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  reversed_at timestamptz
);

create unique index goods_receipts_active_document
  on public.goods_receipts (supplier_id, document_year, document_key) where reversed_at is null;
create index goods_receipts_order_idx on public.goods_receipts (order_id, id);
create index goods_receipts_supplier_date_idx on public.goods_receipts (supplier_id, received_date, receipt_no);

create table public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.goods_receipts(id),
  order_line_id uuid not null references public.supplier_order_lines(id),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  purchase_id uuid not null unique references public.purchases(id),
  unique (receipt_id, order_line_id)
);
create index goods_receipt_lines_order_idx on public.goods_receipt_lines (order_line_id, receipt_id);

create table public.goods_receipt_reversals (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null unique references public.goods_receipts(id),
  reason text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table public.stock_movement_sources (
  product_id uuid not null references public.products(id),
  product_revision bigint not null,
  receipt_line_id uuid not null references public.goods_receipt_lines(id),
  reversal_id uuid references public.goods_receipt_reversals(id),
  adjustment_id uuid unique references public.stock_adjustments(id),
  check ((reversal_id is null) = (adjustment_id is null)),
  primary key (product_id, product_revision)
);

create table public.supplier_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supplier_orders(id),
  action text not null,
  actor_id uuid not null,
  reason text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index supplier_order_events_order_idx on public.supplier_order_events (order_id, created_at desc, id);

create table public.supplier_order_requests (
  actor_id uuid not null,
  request_key uuid not null,
  action text not null,
  payload jsonb not null,
  result jsonb not null,
  primary key (actor_id, request_key)
);

do $$
declare t text;
begin
  foreach t in array array[
    'supplier_orders','supplier_order_lines','goods_receipts','goods_receipt_lines',
    'goods_receipt_reversals','stock_movement_sources','supplier_order_events','supplier_order_requests'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    if t <> 'supplier_order_requests' then
      execute format('grant select on public.%I to authenticated', t);
    end if;
  end loop;
end $$;

create policy procurement_read on public.supplier_orders for select to authenticated using (
  (select public.has_role(auth.uid(),'admin')) and (sent_at is not null or created_by = (select auth.uid()))
);
create policy procurement_read on public.supplier_order_lines for select to authenticated using (
  exists (select 1 from public.supplier_orders o where o.id = order_id)
);
create policy procurement_read on public.supplier_order_events for select to authenticated using (
  exists (select 1 from public.supplier_orders o where o.id = order_id)
);
do $$
declare t text;
begin
  foreach t in array array['goods_receipts','goods_receipt_lines','goods_receipt_reversals','stock_movement_sources'] loop
    execute format('create policy procurement_read on public.%I for select to authenticated using ((select public.has_role(auth.uid(),''admin'')))', t);
  end loop;
end $$;

create view public.supplier_order_line_progress with (security_invoker=true) as
select l.*, coalesce(r.quantity,0)::integer as received_qty, p.stock as current_stock
from public.supplier_order_lines l join public.products p on p.id=l.product_id
left join lateral (
  select sum(rl.quantity) quantity
  from public.goods_receipt_lines rl
  join public.goods_receipts r on r.id=rl.receipt_id
  where rl.order_line_id=l.id and r.reversed_at is null
) r on true;

create view public.supplier_order_overview with (security_invoker=true) as
select o.*,
  coalesce(s.ordered_qty,0) as ordered_qty, coalesce(s.received_qty,0) as received_qty,
  case when o.state <> 'ordered' then o.state
    when s.received_qty = s.ordered_qty and s.ordered_qty > 0 then 'received'
    when s.received_qty > 0 then 'partial' else 'ordered' end as status
from public.supplier_orders o
left join lateral (
  select sum(l.ordered_qty) ordered_qty, sum(l.received_qty) received_qty
  from public.supplier_order_line_progress l where l.order_id=o.id
) s on true;

create view public.procurement_purchase_links with (security_invoker=true) as
select l.purchase_id, r.order_id, r.id as receipt_id, r.receipt_no, r.reversed_at
from public.goods_receipt_lines l join public.goods_receipts r on r.id=l.receipt_id;

create view public.procurement_movement_links with (security_invoker=true) as
select s.product_id, s.product_revision, r.order_id, r.id as receipt_id, r.receipt_no, s.reversal_id
from public.stock_movement_sources s join public.goods_receipt_lines l on l.id=s.receipt_line_id
join public.goods_receipts r on r.id=l.receipt_id;

create view public.procurement_receipt_overview with (security_invoker=true) as
select r.id, r.order_id, r.receipt_no, r.supplier_id, o.supplier_name, r.document_no,
  r.document_date, r.received_date, r.created_at, r.reversed_at,
  coalesce(s.quantity,0) as quantity, coalesce(s.cents,0)::numeric(40,0)::text as total_cents
from public.goods_receipts r join public.supplier_orders o on o.id=r.order_id
left join lateral (
  select sum(l.quantity) quantity, sum(l.quantity * l.unit_cost * 100) cents
  from public.goods_receipt_lines l where l.receipt_id=r.id
) s on true;

revoke all on public.supplier_order_line_progress,public.supplier_order_overview,
  public.procurement_purchase_links,public.procurement_movement_links,public.procurement_receipt_overview from public,anon,authenticated;
grant select on public.supplier_order_line_progress,public.supplier_order_overview,
  public.procurement_purchase_links,public.procurement_movement_links,public.procurement_receipt_overview to authenticated;

create function public.protect_procurement_purchase() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if exists(select 1 from public.goods_receipt_lines where purchase_id=old.id) then
    raise exception 'Bu alım bir mal kabulüne bağlı. Düzeltmeyi kaynak kayıttan yapın.';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.protect_procurement_purchase() from public,anon,authenticated;
create trigger protect_procurement_purchase before update or delete on public.purchases
for each row execute function public.protect_procurement_purchase();

create function public.replace_supplier_order_lines(_order uuid, _supplier uuid, _lines jsonb)
returns void language plpgsql set search_path=public,pg_temp as $$
declare item jsonb; p public.products; selected_code text; cost numeric; qty integer;
begin
  if jsonb_typeof(_lines) is distinct from 'array' or jsonb_array_length(_lines) not between 1 and 100 then
    raise exception 'Siparişe 1 ile 100 arasında ürün ekleyin.';
  end if;
  if (select count(distinct (x->>'product_id')::uuid) from jsonb_array_elements(_lines) x) <> jsonb_array_length(_lines) then
    raise exception 'Her ürünü tek satırda girin.';
  end if;
  delete from public.supplier_order_lines where order_id=_order;
  for item in select value from jsonb_array_elements(_lines) loop
    select * into p from public.products where id=(item->>'product_id')::uuid and is_active;
    if not found then raise exception 'Sipariş ürünü bulunamadı veya satışa kapalı.'; end if;
    selected_code:=nullif(btrim(item->>'supplier_code'),'');
    if not exists(select 1 from public.product_supplier_codes c where c.product_id=p.id
      and c.supplier_id=_supplier and (selected_code is null or c.code=selected_code)) then
      raise exception 'Ürün veya firma kodu seçilen tedarikçiye bağlı değil: %', p.name;
    end if;
    qty:=(item->>'quantity')::integer;
    cost:=(item->>'expected_cost')::numeric;
    if qty is null or qty<=0 or (cost is not null and (cost not between 0 and 9999999999.99 or cost<>round(cost,2))) then
      raise exception 'Sipariş adedi veya tahmini fiyat geçersiz: %', p.name;
    end if;
    insert into public.supplier_order_lines(order_id,product_id,sku,product_name,supplier_code,ordered_qty,expected_cost)
    values(_order,p.id,p.sku,p.name,selected_code,qty,cost);
  end loop;
end $$;
revoke all on function public.replace_supplier_order_lines(uuid,uuid,jsonb) from public,anon,authenticated;

create function public.supplier_order_command(_action text, _payload jsonb, _request_key uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  uid uuid:=auth.uid(); prior public.supplier_order_requests;
  o public.supplier_orders; l public.supplier_order_lines; r public.goods_receipts;
  supplier uuid; supplier_label text; reason text; doc text; doc_key text; doc_date date; received date;
  lines jsonb; item jsonb; qty integer; remaining bigint; cost numeric;
  purchase uuid; receipt_line uuid; adjustment uuid; reversal uuid; version bigint;
  result jsonb; event_details jsonb:='{}';
begin
  if uid is null or not public.has_role(uid,'admin') then raise exception 'Yönetici yetkisi gerekli.'; end if;
  if _request_key is null or jsonb_typeof(_payload) is distinct from 'object'
    or _action is null or _action not in ('create','edit','send','cancel','close','reopen','increase','receive','reverse') then
    raise exception 'Geçersiz işlem.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('supplier-order:'||uid::text||':'||_request_key::text,0));
  select * into prior from public.supplier_order_requests where actor_id=uid and request_key=_request_key;
  if found then
    if prior.action<>_action or prior.payload is distinct from _payload then
      raise exception 'İşlem anahtarı farklı veriyle kullanılamaz.';
    end if;
    return prior.result;
  end if;

  reason:=nullif(btrim(_payload->>'reason'),'');
  if length(reason)>500 or length(coalesce(_payload->>'notes',''))>2000 then
    raise exception 'Not veya gerekçe çok uzun.';
  end if;
  if _action in ('cancel','close','reopen','increase','reverse') and reason is null then
    raise exception 'Bu işlem için gerekçe girin.';
  end if;

  if _action='create' then
    supplier:=(_payload->>'supplier_id')::uuid;
    select name into supplier_label from public.suppliers where id=supplier;
    if not found then raise exception 'Tedarikçi bulunamadı.'; end if;
    insert into public.supplier_orders(supplier_id,supplier_name,expected_date,notes,created_by)
    values(supplier,supplier_label,(_payload->>'expected_date')::date,coalesce(_payload->>'notes',''),uid)
    returning * into o;
    perform public.replace_supplier_order_lines(o.id,o.supplier_id,_payload->'lines');
  else
    select * into o from public.supplier_orders where id=(_payload->>'order_id')::uuid for update;
    if not found or (o.sent_at is null and o.created_by<>uid) then raise exception 'Sipariş bulunamadı.'; end if;
    if _action not in ('receive','reverse') and o.revision is distinct from (_payload->>'revision')::integer then
      raise exception 'Sipariş değişti. Sayfayı yenileyip tekrar deneyin.';
    end if;

    case _action
    when 'edit' then
      if o.state<>'draft' then raise exception 'Yalnız taslak sipariş düzenlenebilir.'; end if;
      perform public.replace_supplier_order_lines(o.id,o.supplier_id,_payload->'lines');
      update public.supplier_orders set expected_date=(_payload->>'expected_date')::date,notes=coalesce(_payload->>'notes','') where id=o.id;
    when 'send' then
      if o.state<>'draft' then raise exception 'Yalnız taslak sipariş gönderilebilir.'; end if;
      if exists(select 1 from public.supplier_order_lines sl join public.products p on p.id=sl.product_id
        where sl.order_id=o.id and (not p.is_active or not exists(
          select 1 from public.product_supplier_codes c where c.product_id=sl.product_id and c.supplier_id=o.supplier_id
          and (sl.supplier_code is null or c.code=sl.supplier_code)
        ))) then raise exception 'Taslakta satışa kapalı veya tedarikçi bağlantısı değişen ürün var.'; end if;
      update public.supplier_orders set state='ordered',sent_at=now() where id=o.id;
    when 'cancel' then
      if o.state not in ('draft','ordered') or exists(select 1 from public.goods_receipts where order_id=o.id) then
        raise exception 'Teslimat kaydı olan siparişte kalan kısmı kapatın.';
      end if;
      update public.supplier_orders set state='cancelled' where id=o.id;
    when 'close' then
      if o.state<>'ordered' or not exists(select 1 from public.supplier_order_line_progress where order_id=o.id and ordered_qty>received_qty) then
        raise exception 'Bu siparişte kapatılabilecek açık miktar yok.';
      end if;
      update public.supplier_orders set state='closed' where id=o.id;
    when 'reopen' then
      if o.state<>'closed' then raise exception 'Yalnız kapatılan sipariş yeniden açılabilir.'; end if;
      update public.supplier_orders set state='ordered' where id=o.id;
    when 'increase' then
      if o.state<>'ordered' then raise exception 'Yalnız gönderilen siparişin adedi artırılabilir.'; end if;
      select * into l from public.supplier_order_lines where id=(_payload->>'line_id')::uuid and order_id=o.id;
      qty:=(_payload->>'quantity')::integer;
      if not found or qty is null or qty<=l.ordered_qty then raise exception 'Yeni adet mevcut sipariş adedinden büyük olmalı.'; end if;
      update public.supplier_order_lines set ordered_qty=qty where id=l.id;
      event_details:=jsonb_build_object('product',l.product_name,'before',l.ordered_qty,'after',qty);
    when 'receive' then
      if o.state<>'ordered' then raise exception 'Mal kabulü için sipariş gönderilmiş ve açık olmalı.'; end if;
      doc:=nullif(btrim(_payload->>'document_no'),'');
      doc_key:=upper(regexp_replace(doc,'[[:space:]]','','g'));
      doc_date:=(_payload->>'document_date')::date;
      received:=(_payload->>'received_date')::date;
      lines:=_payload->'lines';
      if doc is null or length(doc)>80 or doc_date is null or received is null then
        raise exception 'İrsaliye numarası, belge tarihi ve teslim tarihi gerekli.';
      end if;
      if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) not between 1 and 100 then
        raise exception 'En az bir teslimat kalemi girin.';
      end if;
      if (select count(distinct (x->>'line_id')::uuid) from jsonb_array_elements(lines) x)<>jsonb_array_length(lines) then
        raise exception 'Bir teslimat kalemi yalnız bir kez girilebilir.';
      end if;
      begin
        insert into public.goods_receipts(order_id,supplier_id,document_no,document_key,document_date,document_year,received_date,created_by)
        values(o.id,o.supplier_id,doc,doc_key,doc_date,extract(year from doc_date)::integer,received,uid) returning * into r;
      exception when unique_violation then
        raise exception 'Bu tedarikçi ve belge yılı için bu irsaliye zaten kullanılmış.';
      end;
      perform 1 from public.products p where p.id in (
        select sl.product_id from public.supplier_order_lines sl join jsonb_array_elements(lines) x on sl.id=(x->>'line_id')::uuid where sl.order_id=o.id
      ) order by p.id for update;
      for item in select value from jsonb_array_elements(lines) loop
        select * into l from public.supplier_order_lines where id=(item->>'line_id')::uuid and order_id=o.id;
        if not found then raise exception 'Teslimat kalemi bu siparişe ait değil.'; end if;
        select ordered_qty-received_qty into remaining from public.supplier_order_line_progress where id=l.id;
        qty:=(item->>'quantity')::integer;
        cost:=(item->>'unit_cost')::numeric;
        if qty is null or qty<=0 or qty>remaining then raise exception 'Kalan adedi aşan veya geçersiz teslimat: % (kalan %)',l.product_name,remaining; end if;
        if cost is null or cost not between 0 and 9999999999.99 or cost<>round(cost,2) then raise exception 'Alış fiyatı geçersiz: %',l.product_name; end if;
        if exists(select 1 from public.products p where p.id=l.product_id and p.stock::bigint + qty > 2147483647) then
          raise exception 'Kabul sonrası stok kayıt sınırını aşar: %',l.product_name;
        end if;
        insert into public.purchases(supplier_id,product_id,quantity,unit_cost,purchase_date)
        values(o.supplier_id,l.product_id,qty,cost,received) returning id into purchase;
        insert into public.goods_receipt_lines(receipt_id,order_line_id,quantity,unit_cost,purchase_id)
        values(r.id,l.id,qty,cost,purchase) returning id into receipt_line;
        select revision into version from public.products where id=l.product_id;
        insert into public.stock_movement_sources(product_id,product_revision,receipt_line_id)
        values(l.product_id,version,receipt_line);
      end loop;
    when 'reverse' then
      select * into r from public.goods_receipts where id=(_payload->>'receipt_id')::uuid and order_id=o.id for update;
      if not found or r.reversed_at is not null then raise exception 'Mal kabulü bulunamadı veya daha önce ters kaydedildi.'; end if;
      perform 1 from public.products p where p.id in (
        select sl.product_id from public.goods_receipt_lines rl join public.supplier_order_lines sl on sl.id=rl.order_line_id where rl.receipt_id=r.id
      ) order by p.id for update;
      insert into public.goods_receipt_reversals(receipt_id,reason,created_by) values(r.id,reason,uid) returning id into reversal;
      for item in
        select jsonb_build_object('id',rl.id,'product',p.id,'name',p.name,'stock',p.stock,'quantity',rl.quantity)
        from public.goods_receipt_lines rl join public.supplier_order_lines sl on sl.id=rl.order_line_id
        join public.products p on p.id=sl.product_id where rl.receipt_id=r.id
      loop
        qty:=(item->>'stock')::integer-(item->>'quantity')::integer;
        if qty<0 then raise exception 'Ters kayıt stoğu negatife düşürür: %',item->>'name'; end if;
        insert into public.stock_adjustments(product_id,new_stock,reason)
        values((item->>'product')::uuid,qty,'Mal kabulü #'||r.receipt_no||' ters kaydı: '||reason) returning id into adjustment;
        select revision into version from public.products where id=(item->>'product')::uuid;
        insert into public.stock_movement_sources(product_id,product_revision,receipt_line_id,reversal_id,adjustment_id)
        values((item->>'product')::uuid,version,(item->>'id')::uuid,reversal,adjustment);
      end loop;
      update public.goods_receipts set reversed_at=now() where id=r.id;
    end case;
    update public.supplier_orders set revision=revision+1 where id=o.id;
  end if;

  if r.id is not null then event_details:=event_details||jsonb_build_object('receipt_no',r.receipt_no); end if;
  insert into public.supplier_order_events(order_id,action,actor_id,reason,details)
  values(o.id,_action,uid,reason,event_details);
  result:=jsonb_strip_nulls(jsonb_build_object('order_id',o.id,'receipt_id',r.id));
  insert into public.supplier_order_requests(actor_id,request_key,action,payload,result) values(uid,_request_key,_action,_payload,result);
  return result;
end $$;

revoke all on function public.supplier_order_command(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.supplier_order_command(text,jsonb,uuid) to authenticated;

commit;
