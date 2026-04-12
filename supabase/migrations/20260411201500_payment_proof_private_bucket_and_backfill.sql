insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

update public.orders
set payment_proof_url = regexp_replace(
  payment_proof_url,
  '^https?://[^/]+/storage/v1/object/public/[^/]+/',
  ''
)
where payment_proof_url ~ '^https?://[^/]+/storage/v1/object/public/[^/]+/.+';
