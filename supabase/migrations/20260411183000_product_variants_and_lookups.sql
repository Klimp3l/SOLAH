create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.product_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products
add column if not exists category_id uuid references public.categories(id) on delete restrict,
add column if not exists product_type_id uuid references public.product_types(id) on delete restrict;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_id uuid not null references public.colors(id) on delete restrict,
  size_id uuid not null references public.sizes(id) on delete restrict,
  price numeric(10, 2) not null check (price > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, color_id, size_id)
);

insert into public.categories (name)
values ('Sem categoria')
on conflict (name) do nothing;

insert into public.product_types (name)
values ('Geral')
on conflict (name) do nothing;

insert into public.colors (name)
values ('Padrão')
on conflict (name) do nothing;

insert into public.sizes (name, sort_order)
values ('Único', 0)
on conflict (name) do nothing;

update public.products
set category_id = c.id
from public.categories c
where public.products.category_id is null
  and c.name = 'Sem categoria';

update public.products
set product_type_id = t.id
from public.product_types t
where public.products.product_type_id is null
  and t.name = 'Geral';

alter table public.products
alter column category_id set not null,
alter column product_type_id set not null;

insert into public.product_variants (product_id, color_id, size_id, price, active)
select
  p.id,
  c.id,
  s.id,
  p.price,
  p.active
from public.products p
cross join lateral (
  select id
  from public.colors
  where name = 'Padrão'
  limit 1
) c
cross join lateral (
  select id
  from public.sizes
  where name = 'Único'
  limit 1
) s
on conflict (product_id, color_id, size_id) do nothing;

alter table public.order_items
add column if not exists product_variant_id uuid references public.product_variants(id) on delete restrict;

update public.order_items oi
set product_variant_id = pv.id
from public.product_variants pv
join public.colors c on c.id = pv.color_id
join public.sizes s on s.id = pv.size_id
where oi.product_variant_id is null
  and pv.product_id = oi.product_id
  and c.name = 'Padrão'
  and s.name = 'Único';

alter table public.order_items
alter column product_variant_id set not null;

alter table public.order_items drop constraint if exists order_items_order_id_product_id_key;
alter table public.order_items
add constraint order_items_order_id_product_variant_id_key unique (order_id, product_variant_id);

alter table public.categories enable row level security;
alter table public.product_types enable row level security;
alter table public.colors enable row level security;
alter table public.sizes enable row level security;
alter table public.product_variants enable row level security;

create policy "public_read_categories"
on public.categories
for select
to authenticated, anon
using (true);

create policy "public_read_product_types"
on public.product_types
for select
to authenticated, anon
using (true);

create policy "public_read_colors"
on public.colors
for select
to authenticated, anon
using (true);

create policy "public_read_sizes"
on public.sizes
for select
to authenticated, anon
using (true);

create policy "public_read_product_variants"
on public.product_variants
for select
to authenticated, anon
using (
  active = true
  and exists (
    select 1
    from public.products p
    where p.id = product_variants.product_id and p.active = true
  )
);

create policy "admin_manage_categories"
on public.categories
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

create policy "admin_manage_product_types"
on public.product_types
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

create policy "admin_manage_colors"
on public.colors
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

create policy "admin_manage_sizes"
on public.sizes
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);

create policy "admin_manage_product_variants"
on public.product_variants
for all
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  )
);
