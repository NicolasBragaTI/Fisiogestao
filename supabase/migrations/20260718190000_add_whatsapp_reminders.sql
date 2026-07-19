-- First WhatsApp reminder version. Additive and safe for existing records.
alter table public.pacientes
  add column if not exists whatsapp_consent boolean not null default false;

alter table public.atendimentos
  add column if not exists confirmation_status text not null default 'pending',
  add column if not exists reminder_sent_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'atendimentos_confirmation_status_check'
      and conrelid = 'public.atendimentos'::regclass
  ) then
    alter table public.atendimentos
      add constraint atendimentos_confirmation_status_check
      check (confirmation_status in ('pending', 'confirmed', 'cancelled'));
  end if;
end $$;
