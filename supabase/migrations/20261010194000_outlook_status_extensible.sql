-- Provider-specific OAuth/sync statuses are backend-defined; do not constrain values in client metadata.
alter table public.outlook_integracoes
  drop constraint if exists outlook_integracoes_status_check;
