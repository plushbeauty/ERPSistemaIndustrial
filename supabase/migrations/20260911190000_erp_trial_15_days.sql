-- Trial comercial do SGQ ERP: 15 dias por nova empresa.
-- A contagem nasce no servidor quando a empresa é criada; o navegador nunca define a validade.
alter table public.erp_empresas
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_reminder_until timestamptz;

create or replace function public.erp_initialize_trial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trial_started_at is null then
    new.trial_started_at := coalesce(new.created_at, now());
  end if;
  if new.trial_ends_at is null then
    new.trial_ends_at := new.trial_started_at + interval '15 days';
  end if;
  if new.trial_reminder_until is null then
    new.trial_reminder_until := new.trial_ends_at + interval '20 days';
  end if;
  if coalesce(new.plano_status,'') = '' then
    new.plano_status := 'teste';
  end if;
  return new;
end;
$$;

revoke all on function public.erp_initialize_trial() from public;

 drop trigger if exists trg_erp_initialize_trial on public.erp_empresas;
create trigger trg_erp_initialize_trial
before insert on public.erp_empresas
for each row execute function public.erp_initialize_trial();

-- Empresas existentes que ainda não possuem datas de teste recebem o mesmo padrão.
update public.erp_empresas
set trial_started_at = coalesce(trial_started_at, created_at, now()),
    trial_ends_at = coalesce(trial_ends_at, coalesce(created_at, now()) + interval '15 days'),
    trial_reminder_until = coalesce(trial_reminder_until, coalesce(created_at, now()) + interval '35 days')
where trial_started_at is null or trial_ends_at is null or trial_reminder_until is null;

comment on column public.erp_empresas.trial_started_at is 'Início do teste gratuito de 15 dias';
comment on column public.erp_empresas.trial_ends_at is 'Fim do teste gratuito de 15 dias';
comment on column public.erp_empresas.trial_reminder_until is 'Fim da janela de lembretes pós-expiração, 20 dias após o teste';
