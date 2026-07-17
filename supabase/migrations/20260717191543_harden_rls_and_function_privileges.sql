-- Restrict privileged RPC functions to their intended callers.
revoke execute on function public.admin_get_users() from public, anon;
grant execute on function public.admin_get_users() to authenticated;

revoke execute on function public.admin_update_role(uuid, text) from public, anon;
grant execute on function public.admin_update_role(uuid, text) to authenticated;

revoke execute on function public.update_own_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_own_profile(text, text, text, text, text) to authenticated;

-- This function is invoked by an auth.users trigger, never directly through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Attendances belong exclusively to the authenticated owner.
alter policy user_select_atendimentos on public.atendimentos
  to authenticated using ((select auth.uid()) = user_id);
alter policy user_insert_atendimentos on public.atendimentos
  to authenticated with check ((select auth.uid()) = user_id);
alter policy user_update_atendimentos on public.atendimentos
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy user_delete_atendimentos on public.atendimentos
  to authenticated using ((select auth.uid()) = user_id);

-- Patients belong exclusively to the authenticated owner.
alter policy user_select_pacientes on public.pacientes
  to authenticated using ((select auth.uid()) = user_id);
alter policy user_insert_pacientes on public.pacientes
  to authenticated with check ((select auth.uid()) = user_id);
alter policy user_update_pacientes on public.pacientes
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy user_delete_pacientes on public.pacientes
  to authenticated using ((select auth.uid()) = user_id);

-- Packages belong exclusively to the authenticated owner.
alter policy users_own_pacotes on public.pacotes
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Users can access only their own profile row.
alter policy profiles_select_own on public.profiles
  to authenticated using ((select auth.uid()) = id);
alter policy profiles_insert_own on public.profiles
  to authenticated with check ((select auth.uid()) = id);
