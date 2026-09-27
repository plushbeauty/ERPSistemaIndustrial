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

alter table public.erp_empresas
  drop column if exists stripe_customer_id,
  drop column if exists asaas_customer_id,
  drop column if exists subscription_status,
  drop column if exists plan_type,
  drop column if exists subscription_ends_at;

commit;
