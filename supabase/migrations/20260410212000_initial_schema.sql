create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  price numeric(10, 2) not null check (price > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  total numeric(10, 2) not null check (total > 0),
  status text not null check (
    status in (
      'aguardando_pagamento',
      'aguardando_comprovante',
      'pago',
      'em_producao',
      'enviado',
      'entregue',
      'cancelado'
    )
  ),
  tracking_code text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(10, 2) not null check (price > 0),
  unique (order_id, product_id)
);

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "public_read_products"
on public.products
for select
to authenticated, anon
using (active = true);

create policy "public_read_product_images"
on public.product_images
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id and p.active = true
  )
);

create policy "user_read_own_orders"
on public.orders
for select
to authenticated
using (auth.uid() = user_id);

create policy "user_create_own_orders"
on public.orders
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "user_read_own_order_items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  )
);

create policy "admin_all_orders"
on public.orders
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

create policy "admin_all_order_items"
on public.order_items
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

create policy "admin_manage_products"
on public.products
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

create policy "admin_manage_product_images"
on public.product_images
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
