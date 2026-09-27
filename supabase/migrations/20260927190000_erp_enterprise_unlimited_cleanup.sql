begin;

drop trigger if exists trg_erp_initialize_trial on public.erp_empresas;
drop function if exists public.erp_initialize_trial();

alter table public.erp_empresas
  drop column if exists trial_started_at,
  drop column if exists trial_ends_at,
  drop column if exists trial_reminder_until;

update public.erp_empresas
set plano_status = 'ativo'
where lower(coalesce(plano_status,'')) in ('teste','trial','expirado','expired','cancelado','cancelled','inadimplente','delinquent');

update public.erp_empresas
set subscription_status = 'active'
where subscription_status is null
   or lower(subscription_status) in ('trial','expired','cancelled','cancelled','delinquent');

commit;
