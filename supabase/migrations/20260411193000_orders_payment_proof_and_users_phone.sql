alter table public.users
  add column if not exists phone text;

alter table public.orders
  add column if not exists payment_proof_url text;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_id_fkey'
  ) then
    alter table public.users drop constraint users_id_fkey;
  end if;
end $$;
