insert into public.categories (id, name)
values
  ('10000000-0000-0000-0000-000000000001', 'Moda Praia'),
  ('10000000-0000-0000-0000-000000000002', 'Casual')
on conflict (id) do nothing;

insert into public.product_types (id, name)
values
  ('20000000-0000-0000-0000-000000000001', 'Vestido'),
  ('20000000-0000-0000-0000-000000000002', 'Bata'),
  ('20000000-0000-0000-0000-000000000003', 'Camisa'),
  ('20000000-0000-0000-0000-000000000004', 'Saia')
on conflict (id) do nothing;

insert into public.sizes (id, name, sort_order)
values
  ('40000000-0000-0000-0000-000000000001', 'Único', 0),
  ('40000000-0000-0000-0000-000000000002', 'P', 1),
  ('40000000-0000-0000-0000-000000000003', 'M', 2),
  ('40000000-0000-0000-0000-000000000004', 'G', 3),
  ('40000000-0000-0000-0000-000000000005', 'GG', 4)
on conflict (id) do nothing;

insert into public.products (id, category_id, product_type_id, name, description, price, active)
values
  (
    '11111111-1111-1111-1111-111111111111',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Vestido Sol',
    'Vestido leve para praia e resort',
    149.90,
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000004',
    'Saia Brisa',
    'Saia midi fresca para o dia a dia',
    199.90,
    true
  )
on conflict (id) do nothing;

insert into public.product_images (id, product_id, url, position)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'https://example.com/biquini-1.jpg', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'https://example.com/biquini-2.jpg', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'https://example.com/saida-1.jpg', 0)
on conflict (id) do nothing;

insert into public.product_colors (id, product_id, name, image_url)
values
  ('70000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Azul', 'https://example.com/cores/azul.jpg'),
  ('70000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Branco', 'https://example.com/cores/branco.jpg'),
  ('70000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Preto', 'https://example.com/cores/preto.jpg')
on conflict (id) do nothing;

insert into public.product_variants (id, product_id, product_color_id, size_id, price, active)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '70000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000003',
    149.90,
    true
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '70000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000004',
    149.90,
    true
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '22222222-2222-2222-2222-222222222222',
    '70000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000005',
    199.90,
    true
  )
on conflict (id) do nothing;
