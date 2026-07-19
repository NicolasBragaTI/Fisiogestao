create index if not exists idx_atendimentos_paciente_id
  on public.atendimentos (paciente_id);

create index if not exists idx_atendimentos_user_id
  on public.atendimentos (user_id);

create index if not exists idx_pacientes_user_id
  on public.pacientes (user_id);

create index if not exists idx_pacotes_user_id
  on public.pacotes (user_id);
