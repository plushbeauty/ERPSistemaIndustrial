create extension if not exists pgcrypto;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text,
  cnpj text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete restrict,
  nome text not null,
  email text not null,
  perfil text not null default 'operador' check (perfil in ('master','administrador','gestor','qualidade','planejamento','producao','estoque','compras','vendas','financeiro','manutencao','operador')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.unidades_medida (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  descricao text not null,
  ativo boolean not null default true,
  unique(empresa_id,codigo)
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  descricao text not null,
  tipo text not null default 'acabado' check (tipo in ('materia_prima','componente','semiacabado','acabado','servico')),
  unidade_id uuid references public.unidades_medida(id),
  controle_lote boolean not null default false,
  controle_serie boolean not null default false,
  custo_padrao numeric(18,6) not null default 0,
  preco_venda numeric(18,6) not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id,codigo)
);

create table if not exists public.almoxarifados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  descricao text not null,
  ativo boolean not null default true,
  unique(empresa_id,codigo)
);

create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  numero text not null,
  fabricacao date,
  validade date,
  status text not null default 'liberado' check (status in ('quarentena','liberado','bloqueado','consumido')),
  unique(empresa_id,produto_id,numero)
);

create table if not exists public.estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  almoxarifado_id uuid not null references public.almoxarifados(id) on delete restrict,
  lote_id uuid references public.lotes(id),
  tipo text not null check (tipo in ('entrada','saida','transferencia','ajuste','consumo','producao','devolucao')),
  quantidade numeric(18,6) not null check (quantidade > 0),
  documento_tipo text,
  documento_id uuid,
  created_by uuid references public.usuarios(id),
  created_at timestamptz not null default now()
);

create table if not exists public.boms (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  versao text not null,
  status text not null default 'rascunho' check (status in ('rascunho','aprovada','obsoleta')),
  vigencia_inicio date,
  vigencia_fim date,
  unique(empresa_id,produto_id,versao)
);

create table if not exists public.bom_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  bom_id uuid not null references public.boms(id) on delete cascade,
  componente_id uuid not null references public.produtos(id) on delete restrict,
  quantidade numeric(18,6) not null check (quantidade > 0),
  perda_percentual numeric(9,4) not null default 0 check (perda_percentual >= 0),
  sequencia integer not null default 10
);

create table if not exists public.ordens_producao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero bigint generated always as identity,
  produto_id uuid not null references public.produtos(id) on delete restrict,
  bom_id uuid references public.boms(id),
  quantidade_planejada numeric(18,6) not null check (quantidade_planejada > 0),
  quantidade_produzida numeric(18,6) not null default 0,
  status text not null default 'planejada' check (status in ('planejada','liberada','em_producao','pausada','concluida','cancelada')),
  data_prevista date,
  data_inicio timestamptz,
  data_fim timestamptz,
  created_by uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apontamentos_producao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ordem_id uuid not null references public.ordens_producao(id) on delete cascade,
  operador_id uuid references public.usuarios(id),
  quantidade_boa numeric(18,6) not null default 0,
  quantidade_refugo numeric(18,6) not null default 0,
  inicio timestamptz not null,
  fim timestamptz,
  observacao text,
  created_at timestamptz not null default now()
);

create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  razao_social text not null,
  cnpj text,
  email text,
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pedidos_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedores(id),
  numero bigint generated always as identity,
  status text not null default 'rascunho' check (status in ('rascunho','aprovacao','aprovado','recebido','cancelado')),
  total numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  documento text,
  email text,
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pedidos_venda (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id),
  numero bigint generated always as identity,
  status text not null default 'aberto' check (status in ('aberto','confirmado','producao','expedido','faturado','cancelado')),
  total numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inspecoes_qualidade (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid references public.produtos(id),
  lote_id uuid references public.lotes(id),
  ordem_id uuid references public.ordens_producao(id),
  tipo text not null check (tipo in ('recebimento','processo','final','auditoria')),
  resultado text not null default 'pendente' check (resultado in ('pendente','aprovado','reprovado','condicional')),
  observacao text,
  created_by uuid references public.usuarios(id),
  created_at timestamptz not null default now()
);

create table if not exists public.nao_conformidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero bigint generated always as identity,
  origem text not null,
  severidade text not null default 'media' check (severidade in ('baixa','media','alta','critica')),
  descricao text not null,
  status text not null default 'aberta' check (status in ('aberta','contenção','investigacao','capa','encerrada')),
  lote_id uuid references public.lotes(id),
  ordem_id uuid references public.ordens_producao(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capa_acoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nao_conformidade_id uuid not null references public.nao_conformidades(id) on delete cascade,
  tipo text not null check (tipo in ('corretiva','preventiva','contenção')),
  acao text not null,
  responsavel_id uuid references public.usuarios(id),
  prazo date,
  concluida_em timestamptz,
  evidencia_url text
);

create table if not exists public.ativos_manutencao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  descricao text not null,
  setor text,
  criticidade text not null default 'media' check (criticidade in ('baixa','media','alta','critica')),
  ativo boolean not null default true,
  unique(empresa_id,codigo)
);

create table if not exists public.ordens_manutencao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ativo_id uuid not null references public.ativos_manutencao(id),
  tipo text not null check (tipo in ('preventiva','corretiva','preditiva','inspecao')),
  status text not null default 'aberta' check (status in ('aberta','planejada','execucao','aguardando','concluida','cancelada')),
  descricao text not null,
  inicio timestamptz,
  fim timestamptz,
  custo numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.auditoria_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  usuario_id uuid references public.usuarios(id),
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_produtos_empresa on public.produtos(empresa_id);
create index if not exists idx_estoque_empresa_produto on public.estoque_movimentos(empresa_id,produto_id);
create index if not exists idx_lotes_empresa_produto on public.lotes(empresa_id,produto_id);
create index if not exists idx_op_empresa_status on public.ordens_producao(empresa_id,status);
create index if not exists idx_ncr_empresa_status on public.nao_conformidades(empresa_id,status);
create index if not exists idx_usuarios_auth on public.usuarios(auth_user_id);

alter table public.empresas enable row level security;
alter table public.usuarios enable row level security;
alter table public.unidades_medida enable row level security;
alter table public.produtos enable row level security;
alter table public.almoxarifados enable row level security;
alter table public.lotes enable row level security;
alter table public.estoque_movimentos enable row level security;
alter table public.boms enable row level security;
alter table public.bom_itens enable row level security;
alter table public.ordens_producao enable row level security;
alter table public.apontamentos_producao enable row level security;
alter table public.fornecedores enable row level security;
alter table public.pedidos_compra enable row level security;
alter table public.clientes enable row level security;
alter table public.pedidos_venda enable row level security;
alter table public.inspecoes_qualidade enable row level security;
alter table public.nao_conformidades enable row level security;
alter table public.capa_acoes enable row level security;
alter table public.ativos_manutencao enable row level security;
alter table public.ordens_manutencao enable row level security;
alter table public.auditoria_eventos enable row level security;

create or replace function public.usuario_empresa_id()
returns uuid language sql stable security definer set search_path = public
as $$ select empresa_id from public.usuarios where auth_user_id = (select auth.uid()) and ativo = true limit 1 $$;

create or replace function public.usuario_e_master()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.usuarios where auth_user_id = (select auth.uid()) and perfil = 'master' and ativo = true) $$;

-- Base multi-tenant: usuários acessam somente sua empresa; master pode operar globalmente.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['unidades_medida','produtos','almoxarifados','lotes','estoque_movimentos','boms','bom_itens','ordens_producao','apontamentos_producao','fornecedores','pedidos_compra','clientes','pedidos_venda','inspecoes_qualidade','nao_conformidades','capa_acoes','ativos_manutencao','ordens_manutencao','auditoria_eventos']
  LOOP
    EXECUTE format('drop policy if exists tenant_access on public.%I', t);
    EXECUTE format('create policy tenant_access on public.%I for all to authenticated using ((select public.usuario_e_master()) or empresa_id = (select public.usuario_empresa_id())) with check ((select public.usuario_e_master()) or empresa_id = (select public.usuario_empresa_id()))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS own_or_master ON public.usuarios;
CREATE POLICY own_or_master ON public.usuarios FOR SELECT TO authenticated USING (auth_user_id = (select auth.uid()) OR (select public.usuario_e_master()) OR empresa_id = (select public.usuario_empresa_id()));
DROP POLICY IF EXISTS update_own_or_master ON public.usuarios;
CREATE POLICY update_own_or_master ON public.usuarios FOR UPDATE TO authenticated USING (auth_user_id = (select auth.uid()) OR (select public.usuario_e_master())) WITH CHECK (auth_user_id = (select auth.uid()) OR (select public.usuario_e_master()));

DROP POLICY IF EXISTS master_or_own_empresa ON public.empresas;
CREATE POLICY master_or_own_empresa ON public.empresas FOR ALL TO authenticated USING ((select public.usuario_e_master()) OR id = (select public.usuario_empresa_id())) WITH CHECK ((select public.usuario_e_master()) OR id = (select public.usuario_empresa_id()));

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.usuario_e_master() TO authenticated;
