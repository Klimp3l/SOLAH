insert into public.products (id, name, description, price, active)
values
  ('11111111-1111-1111-1111-111111111111', 'Biquíni Sol', 'Biquíni cortininha', 149.90, true),
  ('22222222-2222-2222-2222-222222222222', 'Saída Brisa', 'Saída de praia leve', 199.90, true)
on conflict (id) do nothing;

insert into public.product_images (id, product_id, url, position)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'https://example.com/biquini-1.jpg', 0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'https://example.com/biquini-2.jpg', 1),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'https://example.com/saida-1.jpg', 0)
on conflict (id) do nothing;
