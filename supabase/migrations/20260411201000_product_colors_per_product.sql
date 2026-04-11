create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  image_url text,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

alter table public.product_variants
add column if not exists product_color_id uuid references public.product_colors(id) on delete restrict;

insert into public.product_colors (product_id, name, image_url)
select distinct
  pv.product_id,
  c.name,
  c.image_url
from public.product_variants pv
join public.colors c on c.id = pv.color_id
on conflict (product_id, name) do update
set image_url = excluded.image_url;

update public.product_variants pv
set product_color_id = pc.id
from public.product_colors pc
join public.colors c on c.name = pc.name
where pv.product_color_id is null
  and pv.product_id = pc.product_id
  and pv.color_id = c.id;

alter table public.product_variants
alter column product_color_id set not null;

alter table public.product_variants
drop constraint if exists product_variants_product_id_color_id_size_id_key;

alter table public.product_variants
add constraint product_variants_product_id_product_color_id_size_id_key unique (product_id, product_color_id, size_id);

create index if not exists idx_product_colors_product_id on public.product_colors(product_id);
create index if not exists idx_product_variants_product_color_id on public.product_variants(product_color_id);

alter table public.product_variants
drop constraint if exists product_variants_color_id_fkey;

alter table public.product_variants
drop column if exists color_id;

alter table public.product_colors enable row level security;

create policy "public_read_product_colors"
on public.product_colors
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.products p
    where p.id = product_colors.product_id and p.active = true
  )
);

create policy "admin_manage_product_colors"
on public.product_colors
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
