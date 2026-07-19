-- Baseline schema for fresh environments (QAS/local). No production data is copied.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
  role text default 'user',
  created_at timestamptz default now(),
  telefone text,
  crefito text,
  cidade text,
  estado text,
  avatar_url text
);

create table public.pacientes (
  id text primary key,
  nome text not null,
  tel text,
  nasc text,
  end_local text,
  diag text,
  valor_padrao text,
  obs text,
  created_at timestamp default now(),
  user_id uuid references auth.users(id)
);

create table public.pacotes (
  id text primary key,
  user_id uuid not null references auth.users(id),
  paciente_id text not null,
  nome text not null,
  total_sessoes integer not null default 1,
  valor_sessao numeric not null default 0,
  valor_total numeric not null default 0,
  valor_recebido numeric not null default 0,
  historico_pagamentos jsonb default '[]'::jsonb,
  metodo text,
  status text not null default 'ativo',
  obs text,
  created_at timestamptz default now()
);

create table public.atendimentos (
  id text primary key,
  paciente_id text references public.pacientes(id) on delete cascade,
  data text,
  hora text,
  valor numeric constraint chk_valor_nao_negativo check (valor >= 0),
  metodo text,
  status text,
  vencimento text,
  obs text,
  created_at timestamp default now(),
  user_id uuid references auth.users(id),
  hora_fim text,
  valor_recebido numeric default 0
    constraint chk_valor_recebido_nao_negativo check (valor_recebido >= 0),
  data_pagamento text,
  historico_pagamentos jsonb default '[]'::jsonb,
  pacote_id text,
  constraint chk_valor_recebido_limite check (valor_recebido <= valor + 0.01)
);

alter table public.profiles enable row level security;
alter table public.pacientes enable row level security;
alter table public.pacotes enable row level security;
alter table public.atendimentos enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy user_select_pacientes on public.pacientes
  for select to authenticated using (auth.uid() = user_id);
create policy user_insert_pacientes on public.pacientes
  for insert to authenticated with check (auth.uid() = user_id);
create policy user_update_pacientes on public.pacientes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_delete_pacientes on public.pacientes
  for delete to authenticated using (auth.uid() = user_id);

create policy users_own_pacotes on public.pacotes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_select_atendimentos on public.atendimentos
  for select to authenticated using (auth.uid() = user_id);
create policy user_insert_atendimentos on public.atendimentos
  for insert to authenticated with check (auth.uid() = user_id);
create policy user_update_atendimentos on public.atendimentos
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy user_delete_atendimentos on public.atendimentos
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, nome)
  values (new.id, new.email, 'user', '')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.update_own_profile(
  p_nome text, p_telefone text, p_crefito text, p_cidade text, p_estado text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  update public.profiles set
    nome = p_nome,
    telefone = p_telefone,
    crefito = p_crefito,
    cidade = p_cidade,
    estado = p_estado
  where id = auth.uid();
end;
$$;

create or replace function public.admin_get_users()
returns table(id uuid, email text, role text, created_at timestamptz, nome text)
language plpgsql
security definer
set search_path = public
as $$
declare caller_role text;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Acesso negado: somente administradores';
  end if;
  return query
    select p.id, p.email, p.role, p.created_at, p.nome
    from public.profiles p order by p.created_at desc;
end;
$$;

create or replace function public.admin_update_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare caller_role text;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Acesso negado: somente administradores';
  end if;
  if new_role not in ('admin', 'user', 'disabled') then
    raise exception 'Role invalida';
  end if;
  update public.profiles set role = new_role where id = target_user_id;
end;
$$;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.pacientes to authenticated;
grant select, insert, update, delete on public.pacotes to authenticated;
grant select, insert, update, delete on public.atendimentos to authenticated;

