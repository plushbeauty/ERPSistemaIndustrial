-- Histórico unificado dos processos industriais e ferramental.
create table if not exists public.erp_processos_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  entidade text not null check (entidade in ('PROCESSO','FERRAMENTA','RECEITA')),
  entidade_id uuid not null,
  acao text not null check (acao in ('CRIADO','ALTERADO','INATIVADO')),
  codigo text,
  descricao text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id)
);
create index if not exists idx_erp_processos_historico_empresa_data on public.erp_processos_historico(empresa_id,criado_em desc);
alter table public.erp_processos_historico enable row level security;
drop policy if exists erp_processos_historico_tenant on public.erp_processos_historico;
create policy erp_processos_historico_tenant on public.erp_processos_historico
for select to authenticated using ((select public.erp_is_master()) or empresa_id=(select public.erp_current_empresa_id()));
revoke all on public.erp_processos_historico from anon;
grant select on public.erp_processos_historico to authenticated;

create or replace function public.erp_log_processo_industrial()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.erp_processos_historico(empresa_id,entidade,entidade_id,acao,codigo,descricao,detalhes,criado_por)
 values(coalesce(new.empresa_id,old.empresa_id),'PROCESSO',coalesce(new.id,old.id),
 case when tg_op='INSERT' then 'CRIADO' when coalesce(new.ativo,true)=false and coalesce(old.ativo,true)=true then 'INATIVADO' else 'ALTERADO' end,
 coalesce(new.codigo,old.codigo),coalesce(new.nome,old.nome),
 jsonb_build_object('tipo',coalesce(new.tipo,old.tipo),'capacidade_hora',coalesce(new.capacidade_hora,old.capacidade_hora),'setup_padrao_min',coalesce(new.setup_padrao_min,old.setup_padrao_min),'ciclo_padrao_seg',coalesce(new.ciclo_padrao_seg,old.ciclo_padrao_seg),'ativo',coalesce(new.ativo,old.ativo)),auth.uid());
 return coalesce(new,old);
end; $$;
create or replace function public.erp_log_ferramenta_industrial()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.erp_processos_historico(empresa_id,entidade,entidade_id,acao,codigo,descricao,detalhes,criado_por)
 values(coalesce(new.empresa_id,old.empresa_id),'FERRAMENTA',coalesce(new.id,old.id),
 case when tg_op='INSERT' then 'CRIADO' when coalesce(new.ativo,true)=false and coalesce(old.ativo,true)=true then 'INATIVADO' else 'ALTERADO' end,
 coalesce(new.codigo,old.codigo),coalesce(new.nome,old.nome),
 jsonb_build_object('tipo',coalesce(new.tipo,old.tipo),'vida_ciclos',coalesce(new.vida_ciclos,old.vida_ciclos),'ciclos_realizados',coalesce(new.ciclos_realizados,old.ciclos_realizados),'status',coalesce(new.status,old.status),'ativo',coalesce(new.ativo,old.ativo)),auth.uid());
 return coalesce(new,old);
end; $$;
create or replace function public.erp_log_receita_industrial()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.erp_processos_historico(empresa_id,entidade,entidade_id,acao,codigo,descricao,detalhes,criado_por)
 values(coalesce(new.empresa_id,old.empresa_id),'RECEITA',coalesce(new.id,old.id),
 case when tg_op='INSERT' then 'CRIADO' else 'ALTERADO' end,
 null,'Receita v'||coalesce(new.versao,old.versao)::text,
 jsonb_build_object('processo_id',coalesce(new.processo_id,old.processo_id),'produto_id',coalesce(new.produto_id,old.produto_id),'status',coalesce(new.status,old.status),'versao',coalesce(new.versao,old.versao)),auth.uid());
 return coalesce(new,old);
end; $$;
drop trigger if exists trg_erp_log_processo_industrial on public.erp_processos_industriais;
create trigger trg_erp_log_processo_industrial after insert or update on public.erp_processos_industriais for each row execute function public.erp_log_processo_industrial();
drop trigger if exists trg_erp_log_ferramenta_industrial on public.erp_ferramentas_industriais;
create trigger trg_erp_log_ferramenta_industrial after insert or update on public.erp_ferramentas_industriais for each row execute function public.erp_log_ferramenta_industrial();
drop trigger if exists trg_erp_log_receita_industrial on public.erp_receitas_processos;
create trigger trg_erp_log_receita_industrial after insert or update on public.erp_receitas_processos for each row execute function public.erp_log_receita_industrial();
