-- Industrial process families: injection, pressed, stamping, tooling, extrusion, machining, welding, assembly, cutting and painting.
create table if not exists public.erp_processos_industriais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  codigo text not null,
  nome text not null,
  tipo text not null check (tipo in ('INJECAO','PRENSADOS','ESTAMPARIA','FERRAMENTARIA','EXTRUSAO','USINAGEM','SOLDAGEM','MONTAGEM','CORTE','PINTURA','OUTRO')),
  descricao text,
  unidade_capacidade text,
  capacidade_hora numeric(14,4),
  setup_padrao_min numeric(12,2) not null default 0,
  ciclo_padrao_seg numeric(12,4),
  parametros_padrao jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id),
  atualizado_por uuid references auth.users(id),
  unique (empresa_id, codigo)
);

create table if not exists public.erp_ferramentas_industriais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  codigo text not null,
  nome text not null,
  tipo text not null check (tipo in ('MOLDE','ESTAMPO','FERRAMENTA','DISPOSITIVO','MATRIZ','OUTRO')),
  numero_cavidades integer,
  vida_ciclos numeric(18,2),
  ciclos_realizados numeric(18,2) not null default 0,
  ultima_manutencao_em timestamptz,
  proxima_manutencao_em timestamptz,
  status text not null default 'ATIVA',
  revisao text,
  desenho_referencia text,
  parametros jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id),
  atualizado_por uuid references auth.users(id),
  unique (empresa_id, codigo)
);

create table if not exists public.erp_receitas_processos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  processo_id uuid not null references public.erp_processos_industriais(id) on delete cascade,
  produto_id uuid references public.erp_produtos(id) on delete restrict,
  ferramenta_id uuid references public.erp_ferramentas_industriais(id) on delete restrict,
  maquina_id uuid references public.erp_maquinas(id) on delete restrict,
  versao integer not null default 1,
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','APROVADA','OBSOLETA')),
  parametros jsonb not null default '{}'::jsonb,
  ciclo_seg numeric(12,4),
  setup_min numeric(12,2),
  rendimento_percent numeric(8,3),
  perda_percent numeric(8,3),
  observacoes text,
  aprovada_em timestamptz,
  aprovada_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id),
  atualizado_por uuid references auth.users(id),
  unique (empresa_id, processo_id, produto_id, ferramenta_id, maquina_id, versao)
);

create table if not exists public.erp_apontamentos_processo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  processo_id uuid not null references public.erp_processos_industriais(id) on delete restrict,
  receita_id uuid references public.erp_receitas_processos(id) on delete restrict,
  ordem_producao_id uuid references public.erp_ordens_producao(id) on delete restrict,
  maquina_id uuid references public.erp_maquinas(id) on delete restrict,
  ferramenta_id uuid references public.erp_ferramentas_industriais(id) on delete restrict,
  lote text,
  inicio_em timestamptz not null,
  fim_em timestamptz,
  quantidade_planejada numeric(18,4) not null default 0,
  quantidade_boa numeric(18,4) not null default 0,
  quantidade_refugada numeric(18,4) not null default 0,
  quantidade_reprocessada numeric(18,4) not null default 0,
  motivo_parada text,
  parametros_reais jsonb not null default '{}'::jsonb,
  operador_id uuid references public.erp_funcionarios(id) on delete set null,
  observacoes text,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id)
);

create index if not exists idx_erp_processos_ind_empresa_tipo on public.erp_processos_industriais(empresa_id, tipo, ativo);
create index if not exists idx_erp_ferramentas_ind_empresa_tipo on public.erp_ferramentas_industriais(empresa_id, tipo, ativo);
create index if not exists idx_erp_receitas_processos_empresa_produto on public.erp_receitas_processos(empresa_id, produto_id, status);
create index if not exists idx_erp_apontamentos_processo_empresa_op on public.erp_apontamentos_processo(empresa_id, ordem_producao_id, inicio_em);

alter table public.erp_processos_industriais enable row level security;
alter table public.erp_ferramentas_industriais enable row level security;
alter table public.erp_receitas_processos enable row level security;
alter table public.erp_apontamentos_processo enable row level security;

drop policy if exists erp_processos_industriais_tenant on public.erp_processos_industriais;
create policy erp_processos_industriais_tenant on public.erp_processos_industriais
for all to authenticated
using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()))
with check ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()));

drop policy if exists erp_ferramentas_industriais_tenant on public.erp_ferramentas_industriais;
create policy erp_ferramentas_industriais_tenant on public.erp_ferramentas_industriais
for all to authenticated
using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()))
with check ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()));

drop policy if exists erp_receitas_processos_tenant on public.erp_receitas_processos;
create policy erp_receitas_processos_tenant on public.erp_receitas_processos
for all to authenticated
using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()))
with check ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()));

drop policy if exists erp_apontamentos_processo_tenant on public.erp_apontamentos_processo;
create policy erp_apontamentos_processo_tenant on public.erp_apontamentos_processo
for all to authenticated
using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()))
with check ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()));

revoke all on public.erp_processos_industriais from anon;
revoke all on public.erp_ferramentas_industriais from anon;
revoke all on public.erp_receitas_processos from anon;
revoke all on public.erp_apontamentos_processo from anon;

grant select, insert, update, delete on public.erp_processos_industriais to authenticated;
grant select, insert, update, delete on public.erp_ferramentas_industriais to authenticated;
grant select, insert, update, delete on public.erp_receitas_processos to authenticated;
grant select, insert, update, delete on public.erp_apontamentos_processo to authenticated;
