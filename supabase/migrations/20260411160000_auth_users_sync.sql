create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    'user'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

insert into public.users (id, email, name, role)
select
  au.id,
  coalesce(au.email, ''),
  coalesce(au.raw_user_meta_data ->> 'name', split_part(coalesce(au.email, ''), '@', 1)),
  'user'
from auth.users au
on conflict (id) do update
set
  email = excluded.email,
  name = excluded.name;
