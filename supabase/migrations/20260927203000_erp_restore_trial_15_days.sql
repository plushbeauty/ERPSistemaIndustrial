begin;

alter table public.erp_empresas
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_reminder_until timestamptz,
  add column if not exists trial_inicio timestamptz,
  add column if not exists trial_fim timestamptz;

create or replace function public.erp_initialize_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trial_started_at is null then
    new.trial_started_at := coalesce(new.trial_inicio, new.created_at, now());
  end if;
  if new.trial_inicio is null then
    new.trial_inicio := new.trial_started_at;
  end if;
  if new.trial_ends_at is null then
    new.trial_ends_at := coalesce(new.trial_fim, new.trial_started_at + interval '15 days');
  end if;
  if new.trial_fim is null then
    new.trial_fim := new.trial_ends_at;
  end if;
  if new.trial_reminder_until is null then
    new.trial_reminder_until := new.trial_ends_at + interval '20 days';
  end if;
  if coalesce(new.plano_status, '') = '' then
    new.plano_status := 'trial';
  end if;
  return new;
end;
$$;

revoke all on function public.erp_initialize_trial() from public;

drop trigger if exists trg_erp_initialize_trial on public.erp_empresas;
create trigger trg_erp_initialize_trial
before insert on public.erp_empresas
for each row execute function public.erp_initialize_trial();

update public.erp_empresas
set trial_started_at = coalesce(trial_started_at, trial_inicio, created_at, now()),
    trial_inicio = coalesce(trial_inicio, trial_started_at, created_at, now()),
    trial_ends_at = coalesce(trial_ends_at, trial_fim, coalesce(created_at, now()) + interval '15 days'),
    trial_fim = coalesce(trial_fim, trial_ends_at, coalesce(created_at, now()) + interval '15 days'),
    trial_reminder_until = coalesce(trial_reminder_until, coalesce(trial_ends_at, trial_fim, now() + interval '15 days') + interval '20 days')
where trial_started_at is null
   or trial_inicio is null
   or trial_ends_at is null
   or trial_fim is null
   or trial_reminder_until is null;

comment on column public.erp_empresas.trial_started_at is 'Início técnico do teste gratuito de 15 dias';
comment on column public.erp_empresas.trial_ends_at is 'Fim técnico do teste gratuito de 15 dias';
comment on column public.erp_empresas.trial_inicio is 'Início comercial do teste gratuito de 15 dias';
comment on column public.erp_empresas.trial_fim is 'Fim comercial do teste gratuito de 15 dias';
comment on column public.erp_empresas.trial_reminder_until is 'Fim da janela de lembretes pós-expiração';

commit;
