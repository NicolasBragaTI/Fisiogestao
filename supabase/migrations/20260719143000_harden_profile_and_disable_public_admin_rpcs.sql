-- Allow profile edits through normal RLS instead of a SECURITY DEFINER RPC.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.update_own_profile(
  p_nome text, p_telefone text, p_crefito text, p_cidade text, p_estado text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  update public.profiles
  set nome = p_nome,
      telefone = p_telefone,
      crefito = p_crefito,
      cidade = p_cidade,
      estado = p_estado
  where id = (select auth.uid());
end;
$$;

revoke execute on function public.update_own_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_own_profile(text, text, text, text, text) to authenticated;

-- Administrative SECURITY DEFINER routines are intentionally unavailable
-- through the browser-facing Data API. Initial account management remains in
-- the Supabase Dashboard until it is moved to a server-side Edge Function.
revoke execute on function public.admin_get_users() from public, anon, authenticated;
revoke execute on function public.admin_update_role(uuid, text) from public, anon, authenticated;
