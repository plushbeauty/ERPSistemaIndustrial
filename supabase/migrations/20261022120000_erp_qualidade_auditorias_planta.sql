-- SYSNQRA · Auditorias internas de processo e produto · 2026-10-22
create sequence if not exists public.erp_qualidade_auditoria_planta_seq;

create table if not exists public.erp_qualidade_auditorias_planta (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  codigo_auditoria text not null,
  maquina_id uuid not null references public.erp_maquinas(id) on delete restrict,
  auditor_nome text not null,
  posto_operador text not null,
  data_auditoria date not null default current_date,
  ficha_processo_conforme boolean,
  instrumento_calibrado boolean,
  fifo_lote_correto boolean,
  observacoes_desvio text,
  resultado_final text not null default 'EM_EXECUCAO'
    check (resultado_final in ('PLANEJADA','EM_EXECUCAO','CONFORME','NAO_CONFORME')),
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, codigo_auditoria)
);

create index if not exists idx_qualidade_auditorias_planta_empresa_data
  on public.erp_qualidade_auditorias_planta (empresa_id, data_auditoria desc);

create or replace function public.erp_qualidade_auditoria_planta_defaults()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(trim(new.codigo_auditoria), '') = '' then
    new.codigo_auditoria := 'AUD-' || to_char(coalesce(new.data_auditoria, current_date), 'YYYY') || '-' ||
      lpad(nextval('public.erp_qualidade_auditoria_planta_seq')::text, 6, '0');
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_qualidade_auditoria_planta_defaults on public.erp_qualidade_auditorias_planta;
create trigger trg_qualidade_auditoria_planta_defaults
before insert or update on public.erp_qualidade_auditorias_planta
for each row execute function public.erp_qualidade_auditoria_planta_defaults();

alter table public.erp_qualidade_auditorias_planta enable row level security;
drop policy if exists qualidade_auditorias_planta_tenant on public.erp_qualidade_auditorias_planta;
create policy qualidade_auditorias_planta_tenant
on public.erp_qualidade_auditorias_planta
for all to authenticated
using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()))
with check ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()));

revoke all on public.erp_qualidade_auditorias_planta from anon;
grant select, insert, update on public.erp_qualidade_auditorias_planta to authenticated;
grant usage, select on sequence public.erp_qualidade_auditoria_planta_seq to authenticated;
