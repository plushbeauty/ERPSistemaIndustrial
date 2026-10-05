-- Injeção industrial: integridade do cadastro, histórico e isolamento por empresa.
alter table public.erp_moldes add column if not exists localizacao_fisica text;
alter table public.erp_moldes add column if not exists limite_ciclos_preventiva bigint;

create table if not exists public.erp_injecao_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  entidade text not null check (entidade in ('INJETORA','MOLDE')),
  entidade_id uuid not null,
  acao text not null check (acao in ('CRIADO','ALTERADO','INATIVADO')),
  codigo text,
  descricao text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id)
);

create index if not exists idx_erp_injecao_historico_empresa_entidade
  on public.erp_injecao_historico(empresa_id, entidade, entidade_id, criado_em desc);

alter table public.erp_injecao_historico enable row level security;

drop policy if exists erp_injecao_historico_tenant on public.erp_injecao_historico;
create policy erp_injecao_historico_tenant on public.erp_injecao_historico
for select to authenticated
using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()));

revoke all on public.erp_injecao_historico from anon;
grant select on public.erp_injecao_historico to authenticated;

create or replace function public.erp_injecao_log_machine()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.erp_injecao_historico(empresa_id,entidade,entidade_id,acao,codigo,descricao,detalhes,criado_por)
  values (
    coalesce(new.empresa_id,old.empresa_id),
    'INJETORA',
    coalesce(new.id,old.id),
    case when tg_op='INSERT' then 'CRIADO' when coalesce(new.ativo,true)=false and coalesce(old.ativo,true)=true then 'INATIVADO' else 'ALTERADO' end,
    coalesce(new.codigo,old.codigo),
    coalesce(new.nome,old.nome),
    jsonb_build_object('tipo',coalesce(new.tipo,old.tipo),'status',coalesce(new.status,old.status),'ativo',coalesce(new.ativo,old.ativo),'valor_hora_custo',coalesce(new.valor_hora_custo,old.valor_hora_custo)),
    auth.uid()
  );
  return coalesce(new,old);
end;
$$;

create or replace function public.erp_injecao_log_mold()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.erp_injecao_historico(empresa_id,entidade,entidade_id,acao,codigo,descricao,detalhes,criado_por)
  values (
    coalesce(new.empresa_id,old.empresa_id),
    'MOLDE',
    coalesce(new.id,old.id),
    case when tg_op='INSERT' then 'CRIADO' when coalesce(new.ativo,true)=false and coalesce(old.ativo,true)=true then 'INATIVADO' else 'ALTERADO' end,
    coalesce(new.codigo,old.codigo),
    coalesce(new.nome,old.nome),
    jsonb_build_object('tipo',coalesce(new.tipo,old.tipo),'status',coalesce(new.status,old.status),'ativo',coalesce(new.ativo,old.ativo),'numero_cavidades',coalesce(new.numero_cavidades,old.numero_cavidades),'cavidades_ativas',coalesce(new.cavidades_ativas,old.cavidades_ativas),'limite_ciclos',coalesce(new.limite_ciclos,old.limite_ciclos)),
    auth.uid()
  );
  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_erp_injecao_log_machine on public.erp_maquinas;
create trigger trg_erp_injecao_log_machine
after insert or update on public.erp_maquinas
for each row execute function public.erp_injecao_log_machine();

drop trigger if exists trg_erp_injecao_log_mold on public.erp_moldes;
create trigger trg_erp_injecao_log_mold
after insert or update on public.erp_moldes
for each row execute function public.erp_injecao_log_mold();

grant execute on function public.erp_injecao_log_machine() to authenticated;
grant execute on function public.erp_injecao_log_mold() to authenticated;
