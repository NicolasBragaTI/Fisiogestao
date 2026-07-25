-- Restore account administration without exposing privileged RPCs.
-- The helper lives outside the exposed public schema and is used only by RLS.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
  for select to authenticated
  using ((select private.is_admin()));

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using ((select private.is_admin()))
  with check (
    (select private.is_admin())
    and role in ('admin', 'user', 'disabled')
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('admin', 'user', 'disabled')) not valid;
    alter table public.profiles validate constraint profiles_role_check;
  end if;
end
$$;

-- Keep the former privileged RPCs blocked. Administration now uses RLS.
revoke execute on function public.admin_get_users() from public, anon, authenticated;
revoke execute on function public.admin_update_role(uuid, text) from public, anon, authenticated;
