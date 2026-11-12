
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profile update own" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, full_name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_roles(user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Catalog
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, sort int not null default 0);
create table public.brands (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique);
create table public.vehicle_models (id uuid primary key default gen_random_uuid(), brand_id uuid not null references public.brands(id) on delete cascade, name text not null);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique, description text,
  image_url text, price numeric(12,2) not null default 0,
  stock int not null default 0, min_stock int not null default 50,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.product_oem_numbers (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, oem text not null);
create table public.product_vehicles (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, brand_id uuid not null references public.brands(id) on delete cascade, model_id uuid references public.vehicle_models(id) on delete cascade);

do $$ declare t text; begin
  foreach t in array array['categories','brands','vehicle_models','products','product_oem_numbers','product_vehicles'] loop
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

-- Customer accounts (cari)
create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  company_name text not null, address text, phone text, notes text,
  discount_rate numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customer_accounts to authenticated;
grant all on public.customer_accounts to service_role;
alter table public.customer_accounts enable row level security;
create policy "own account read" on public.customer_accounts for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin accounts" on public.customer_accounts for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Suppliers & purchases
create table public.suppliers (id uuid primary key default gen_random_uuid(), name text not null, phone text, address text, created_at timestamptz not null default now());
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null, unit_cost numeric(12,2) not null,
  purchase_date date not null default current_date,
  created_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['suppliers','purchases'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "admin only" on public.%I for all to authenticated using (public.has_role(auth.uid(),''admin'')) with check (public.has_role(auth.uid(),''admin''))', t);
  end loop;
end $$;

create or replace function public.purchase_stock() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op = 'INSERT' then update products set stock = stock + new.quantity where id = new.product_id;
  elsif tg_op = 'DELETE' then update products set stock = stock - old.quantity where id = old.product_id; return old;
  end if;
  return new;
end $$;
create trigger purchases_stock after insert or delete on public.purchases for each row execute function public.purchase_stock();

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no serial,
  user_id uuid not null,
  customer_account_id uuid references public.customer_accounts(id) on delete set null,
  status text not null default 'pending',
  discount_rate numeric(5,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity int not null, unit_price numeric(12,2) not null
);
create table public.account_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid not null references public.customer_accounts(id) on delete cascade,
  type text not null, -- debit (borç) / credit (tahsilat)
  amount numeric(12,2) not null,
  description text, payment_method text,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.orders, public.order_items, public.account_transactions to authenticated;
grant usage on sequence public.orders_order_no_seq to authenticated;
grant all on public.orders, public.order_items, public.account_transactions to service_role;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.account_transactions enable row level security;
create policy "own orders" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin orders" on public.orders for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "own items" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin'))));
create policy "admin items" on public.order_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "own tx" on public.account_transactions for select to authenticated using (exists(select 1 from public.customer_accounts c where c.id=customer_account_id and c.user_id=auth.uid()) or public.has_role(auth.uid(),'admin'));
create policy "admin tx" on public.account_transactions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Place order: prices computed server-side
create or replace function public.place_order(_items jsonb, _notes text default null)
returns uuid language plpgsql security definer set search_path=public as $$
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
    _price := round(p.price * (1 - _rate/100), 2);
    insert into order_items(order_id, product_id, product_name, quantity, unit_price) values (_oid, p.id, p.name, _q, _price);
    _total := _total + _price * _q;
  end loop;
  update orders set total = _total where id = _oid;
  return _oid;
end $$;
revoke execute on function public.place_order(jsonb, text) from anon;
grant execute on function public.place_order(jsonb, text) to authenticated;

-- Status change: stock + cari debit
create or replace function public.order_status_change() returns trigger language plpgsql security definer set search_path=public as $$
declare was_active boolean := old.status in ('approved','shipped'); is_active boolean := new.status in ('approved','shipped');
begin
  if is_active and not was_active then
    update products p set stock = p.stock - oi.quantity from order_items oi where oi.order_id = new.id and oi.product_id = p.id;
    if new.customer_account_id is not null then
      insert into account_transactions(customer_account_id, type, amount, description, order_id)
      values (new.customer_account_id, 'debit', new.total, 'Sipariş #' || new.order_no, new.id);
    end if;
  elsif was_active and not is_active then
    update products p set stock = p.stock + oi.quantity from order_items oi where oi.order_id = new.id and oi.product_id = p.id;
    delete from account_transactions where order_id = new.id and type = 'debit';
  end if;
  return new;
end $$;
create trigger orders_status after update of status on public.orders for each row execute function public.order_status_change();

-- Seed
insert into public.categories(name, slug, sort) values
('Kapı Döşeme Klipsleri','kapi-doseme',1),('Tampon Klipsleri','tampon',2),('Çamurluk & Davlumbaz','camurluk',3),
('Bagaj Klipsleri','bagaj',4),('Motor Altı Muhafaza','motor-alti',5),('Kaput İzolasyon','kaput',6);
insert into public.brands(name, slug) values ('Volkswagen','volkswagen'),('Renault','renault'),('Fiat','fiat'),('Ford','ford'),('Toyota','toyota'),('BMW','bmw'),('Mercedes-Benz','mercedes'),('Hyundai','hyundai');
insert into public.vehicle_models(brand_id, name) select id, m from public.brands b, unnest(case b.slug
 when 'volkswagen' then array['Golf','Passat','Polo','Caddy']
 when 'renault' then array['Clio','Megane','Fluence']
 when 'fiat' then array['Egea','Doblo','Linea']
 when 'ford' then array['Focus','Fiesta','Transit']
 when 'toyota' then array['Corolla','Yaris']
 when 'bmw' then array['3 Serisi','5 Serisi']
 when 'mercedes' then array['C Serisi','E Serisi','Sprinter']
 when 'hyundai' then array['i20','Accent'] end) m;

insert into public.products(name, slug, description, price, stock, category_id) values
('Kapı Döşeme Klipsi - Siyah','kapi-doseme-klipsi-siyah','Kapı iç döşeme paneli için naylon klips. 100 adetlik paket fiyatıdır.',4.50,1200,(select id from categories where slug='kapi-doseme')),
('Tampon Bağlantı Klipsi','tampon-baglanti-klipsi','Ön ve arka tampon sabitleme klipsi, dayanıklı polyamid.',6.75,800,(select id from categories where slug='tampon')),
('Çamurluk Davlumbaz Pimi','camurluk-davlumbaz-pimi','Çamurluk içi davlumbaz plastik pimi, 8mm delik.',3.20,30,(select id from categories where slug='camurluk')),
('Bagaj Döşeme Tıpası','bagaj-doseme-tipasi','Bagaj yan döşeme sabitleme tıpası.',5.10,450,(select id from categories where slug='bagaj')),
('Motor Altı Muhafaza Klipsi','motor-alti-muhafaza-klipsi','Motor alt karter muhafazası için vida tipli klips.',7.90,0,(select id from categories where slug='motor-alti')),
('Kaput İzolasyon Klipsi','kaput-izolasyon-klipsi','Kaput altı ses izolasyon keçesi klipsi.',3.95,600,(select id from categories where slug='kaput'));

insert into public.product_oem_numbers(product_id, oem) values
((select id from products where slug='kapi-doseme-klipsi-siyah'),'1H0868243'),
((select id from products where slug='kapi-doseme-klipsi-siyah'),'7701469521'),
((select id from products where slug='tampon-baglanti-klipsi'),'5Q0807300'),
((select id from products where slug='camurluk-davlumbaz-pimi'),'7703077435'),
((select id from products where slug='camurluk-davlumbaz-pimi'),'46749329'),
((select id from products where slug='bagaj-doseme-tipasi'),'1J0868243'),
((select id from products where slug='motor-alti-muhafaza-klipsi'),'90467-07201'),
((select id from products where slug='kaput-izolasyon-klipsi'),'51471958215');

insert into public.product_vehicles(product_id, brand_id, model_id)
select p.id, m.brand_id, m.id from products p join vehicle_models m on true join brands b on b.id=m.brand_id
where (p.slug='kapi-doseme-klipsi-siyah' and m.name in ('Golf','Passat','Clio','Megane'))
   or (p.slug='tampon-baglanti-klipsi' and m.name in ('Golf','Polo'))
   or (p.slug='camurluk-davlumbaz-pimi' and m.name in ('Clio','Fluence','Egea','Doblo'))
   or (p.slug='bagaj-doseme-tipasi' and m.name in ('Golf','Caddy'))
   or (p.slug='motor-alti-muhafaza-klipsi' and m.name in ('Corolla','Yaris'))
   or (p.slug='kaput-izolasyon-klipsi' and m.name in ('3 Serisi','5 Serisi'));

insert into public.suppliers(name, phone) values ('Anadolu Plastik Ltd.','0212 000 00 00');
