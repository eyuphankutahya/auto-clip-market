-- Schema handoff for the Lovable-managed database.
begin;

create table public.purchase_draft_lines (
  owner_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null,
  sku text,
  product_name text not null,
  supplier_id uuid not null,
  supplier_name text not null,
  supplier_codes text[] not null default '{}',
  quantity bigint not null check (
    quantity between 100 and 9007199254740900 and quantity % 100 = 0
  ),
  primary key (owner_id, product_id)
);

alter table public.purchase_draft_lines enable row level security;

revoke all on public.purchase_draft_lines from public, anon, authenticated;
grant select, insert, update, delete on public.purchase_draft_lines to authenticated;

create policy "Administrators manage their own purchase draft lines"
on public.purchase_draft_lines
for all
to authenticated
using (
  owner_id = (select auth.uid())
  and (select public.has_role(auth.uid(), 'admin'))
)
with check (
  owner_id = (select auth.uid())
  and (select public.has_role(auth.uid(), 'admin'))
);

commit;
