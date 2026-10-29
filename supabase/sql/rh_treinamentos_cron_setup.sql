-- CONFIGURAÇÃO MANUAL DE CRON — executar após configurar os segredos no Supabase Vault.
-- Vault secrets obrigatórios:
--   project_url: https://<project-ref>.supabase.co
--   rh_alert_cron_secret: o mesmo valor definido como RH_ALERT_CRON_SECRET na Edge Function
-- Edge Function secrets obrigatórios: RESEND_API_KEY, RH_ALERT_EMAIL_FROM, RH_ALERT_EMAIL_TO.
-- 05:00 UTC corresponde a 02:00 em São Paulo (UTC-3).
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $setup$
declare
  project_url text;
  cron_secret text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'rh_alert_cron_secret';
  if coalesce(project_url, '') = '' or coalesce(cron_secret, '') = '' then
    raise exception 'Configure os segredos project_url e rh_alert_cron_secret no Supabase Vault antes de agendar o job.';
  end if;
  if project_url !~ '^https://[a-z0-9-]+\.supabase\.co$' then
    raise exception 'O segredo project_url deve conter apenas a URL HTTPS do projeto Supabase.';
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'alerta-diario-vencimento-nrs';
  perform cron.schedule(
    'alerta-diario-vencimento-nrs',
    '0 5 * * *',
    format(
      $job$
      select net.http_post(
        url := %L || '/functions/v1/notificar-vencimento-nrs',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb
      );
      $job$,
      project_url,
      cron_secret
    )
  );
end
$setup$;
