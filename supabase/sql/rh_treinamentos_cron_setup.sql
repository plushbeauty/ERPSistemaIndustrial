-- CONFIGURAÇÃO MANUAL DE CRON — executar após configurar os segredos no Supabase Vault.
-- Crie os segredos no Vault com os nomes:
--   project_url: https://<project-ref>.supabase.co
--   rh_alert_cron_secret: o mesmo valor definido como RH_ALERT_CRON_SECRET na Edge Function
-- Configure também na Edge Function: RESEND_API_KEY, RH_ALERT_EMAIL_FROM e RH_ALERT_EMAIL_TO.
-- O job roda às 02:00 UTC (não necessariamente 02:00 no horário de Brasília).
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'alerta-diario-vencimento-nrs';

select cron.schedule(
  'alerta-diario-vencimento-nrs',
  '0 2 * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/notificar-vencimento-nrs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'rh_alert_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $job$
);
