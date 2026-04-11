drop policy if exists "public_read_colors" on public.colors;
drop policy if exists "admin_manage_colors" on public.colors;

drop table if exists public.colors;

create index if not exists idx_product_colors_product_id on public.product_colors(product_id);
create index if not exists idx_product_variants_product_color_id on public.product_variants(product_color_id);
