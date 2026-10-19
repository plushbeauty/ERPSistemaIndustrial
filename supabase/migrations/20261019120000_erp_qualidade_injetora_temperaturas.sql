-- Temperaturas reais registradas no controle de processo da injetora.
-- Revisão 2026-10-19: campos persistidos por registro, sem dados simulados.
alter table public.erp_qualidade_controles_injetora
  add column if not exists temp_zona1 numeric null check (temp_zona1 is null or temp_zona1 between 0 and 500),
  add column if not exists temp_zona2 numeric null check (temp_zona2 is null or temp_zona2 between 0 and 500),
  add column if not exists temp_zona3 numeric null check (temp_zona3 is null or temp_zona3 between 0 and 500),
  add column if not exists temp_zona4 numeric null check (temp_zona4 is null or temp_zona4 between 0 and 500),
  add column if not exists temp_bico numeric null check (temp_bico is null or temp_bico between 0 and 500),
  add column if not exists temp_molde numeric null check (temp_molde is null or temp_molde between 0 and 300);
