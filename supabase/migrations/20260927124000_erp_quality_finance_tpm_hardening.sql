-- ERP Industrial: apuração real de custos + reforço TPM
-- Compatível com o modelo de manutenção já existente no projeto.
create table if not exists public.erp_financeiro_apuracao_custos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo_produto text not null,
  custo_padrao_total numeric(12,4) not null default 0,
  custo_real_total numeric(12,4) not null default 0,
  data_apuracao timestamptz not null default now()
);
create index if not exists idx_erp_fin_apuracao_empresa_data
  on public.erp_financeiro_apuracao_custos(empresa_id,data_apuracao desc);
alter table public.erp_financeiro_apuracao_custos enable row level security;
drop policy if exists erp_fin_apuracao_tenant on public.erp_financeiro_apuracao_custos;
create policy erp_fin_apuracao_tenant on public.erp_financeiro_apuracao_custos
for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

alter table public.erp_manutencao_ordens add column if not exists numero_os text;
alter table public.erp_manutencao_ordens add column if not exists inicio_atendimento timestamptz;
alter table public.erp_manutencao_ordens add column if not exists data_fechamento timestamptz;
alter table public.erp_manutencao_ordens add column if not exists laudo_tecnico text;

create or replace function public.erp_tpm_sync_machine_status()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if new.status in ('ABERTA','EM_EXECUCAO') then
    update public.erp_maquinas
       set status='BLOQUEADA_MANUTENCAO'
     where id=new.ativo_id and empresa_id=new.empresa_id;
  elsif new.status='CONCLUIDA' then
    update public.erp_maquinas
       set status='ATIVO'
     where id=new.ativo_id and empresa_id=new.empresa_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_tpm_sync_machine_status on public.erp_manutencao_ordens;
create trigger trg_erp_tpm_sync_machine_status
after insert or update of status on public.erp_manutencao_ordens
for each row execute function public.erp_tpm_sync_machine_status();

revoke all on function public.erp_tpm_sync_machine_status() from public;
grant execute on function public.erp_tpm_sync_machine_status() to authenticated;
