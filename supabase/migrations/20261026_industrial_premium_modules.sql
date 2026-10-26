-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — MÓDULOS PREMIUM (FASE 1: BANCO DE DADOS)
-- Data: 2026-10-26
-- CRM, MRP II, MES, SPED BLOCO K e portais externos.
-- Requer o núcleo ERP existente: erp_empresas, erp_usuarios,
-- erp_clientes, erp_produtos e as funções de segurança ERP.
-- ============================================================================
begin;

create extension if not exists pgcrypto;
set local search_path = public, pg_catalog;

-- 1. CRM INDUSTRIAL
create table if not exists public.erp_crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid not null references public.erp_clientes(id) on delete restrict,
  titulo varchar(255) not null check (length(btrim(titulo)) > 0),
  estagio varchar(50) not null check (estagio in
    ('prospeccao','qualificacao','proposta','negociacao','ganho','perdido')),
  valor_estimado numeric(15,4) not null default 0 check (valor_estimado >= 0),
  probabilidade numeric(5,2) not null default 10 check (probabilidade between 0 and 100),
  data_fechamento_prevista date,
  criado_por uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create table if not exists public.erp_crm_orcamentos (
  id uuid primary key default gen_random_uuid(),
  oportunidade_id uuid,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo_orcamento varchar(50) not null check (length(btrim(codigo_orcamento)) > 0),
  produto_base_nome varchar(255) not null check (length(btrim(produto_base_nome)) > 0),
  material_id uuid references public.erp_produtos(id) on delete set null,
  peso_peca_gramas numeric(10,4) not null check (peso_peca_gramas > 0),
  peso_galho_gramas numeric(10,4) not null default 0 check (peso_galho_gramas >= 0),
  tempo_ciclo_segundos numeric(10,2) not null check (tempo_ciclo_segundos > 0),
  cavidades_molde integer not null default 1 check (cavidades_molde > 0),
  custo_materia_prima_kg numeric(15,4) not null check (custo_materia_prima_kg >= 0),
  custo_hora_maquina numeric(15,4) not null check (custo_hora_maquina >= 0),
  margem_lucro_desejada numeric(5,2) not null check (margem_lucro_desejada between 0 and 1000),
  preco_venda_calculado numeric(15,4) not null check (preco_venda_calculado >= 0),
  status varchar(30) not null default 'rascunho'
    check (status in ('rascunho','enviado','aprovado','rejeitado')),
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo_orcamento),
  constraint erp_crm_orcamentos_oportunidade_fk
    foreign key (oportunidade_id, empresa_id)
    references public.erp_crm_oportunidades(id, empresa_id) on delete cascade
);

-- 2. MRP II
create table if not exists public.erp_mrp_execucoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  executado_por uuid references public.erp_usuarios(id) on delete set null,
  status varchar(30) not null default 'processando'
    check (status in ('processando','sucesso','falha')),
  created_at timestamptz not null default now(),
  unique (id, empresa_id)
);

create table if not exists public.erp_mrp_sugestoes (
  id uuid primary key default gen_random_uuid(),
  execucao_id uuid not null,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  tipo_sugestao varchar(20) not null check (tipo_sugestao in ('comprar','produzir')),
  quantidade_necessaria numeric(15,4) not null check (quantidade_necessaria >= 0),
  quantidade_sugerida numeric(15,4) not null check (quantidade_sugerida >= 0),
  data_limite date not null,
  status varchar(30) not null default 'pendente'
    check (status in ('pendente','convertido','arquivado')),
  pedido_origem_id uuid,
  created_at timestamptz not null default now(),
  constraint erp_mrp_sugestoes_execucao_fk
    foreign key (execucao_id, empresa_id)
    references public.erp_mrp_execucoes(id, empresa_id) on delete cascade
);

-- 3. MES / TELEMETRIA
-- maquina_id e ordem_producao_id ficam sem FK nesta fase porque os nomes e
-- contratos dessas tabelas variam entre versões do ERP; validar antes de vincular.
create table if not exists public.erp_mes_conectores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  maquina_id uuid not null,
  protocolo varchar(20) not null default 'OPC_UA'
    check (protocolo in ('OPC_UA','MQTT','MODBUS')),
  endpoint_url varchar(255) not null check (length(btrim(endpoint_url)) > 0),
  ativo boolean not null default true,
  last_ping timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, maquina_id, protocolo)
);

create table if not exists public.erp_mes_telemetria (
  id bigint generated by default as identity primary key,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  maquina_id uuid not null,
  ordem_producao_id uuid,
  total_ciclos_acumulado bigint not null check (total_ciclos_acumulado >= 0),
  contagem_pecas_boas integer not null default 0 check (contagem_pecas_boas >= 0),
  contagem_pecas_refugo integer not null default 0 check (contagem_pecas_refugo >= 0),
  temperatura_zona_1 numeric(6,2),
  temperatura_zona_2 numeric(6,2),
  pressao_injecao_bar numeric(7,2) check (pressao_injecao_bar is null or pressao_injecao_bar >= 0),
  "timestamp" timestamptz not null default now()
);

-- 4. SPED FISCAL — BLOCO K
create table if not exists public.erp_fiscal_bloco_k_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  periodo_referencia date not null check (extract(day from periodo_referencia) = 1),
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_estoque numeric(15,4) not null check (quantidade_estoque >= 0),
  tipo_propriedade char(1) not null check (tipo_propriedade in ('0','1','2')),
  created_at timestamptz not null default now(),
  unique (empresa_id, periodo_referencia, produto_id, tipo_propriedade)
);

create table if not exists public.erp_fiscal_bloco_k_producao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  periodo_referencia date not null check (extract(day from periodo_referencia) = 1),
  ordem_producao_id uuid not null,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_produzida numeric(15,4) not null check (quantidade_produzida >= 0),
  created_at timestamptz not null default now()
);

-- 5. PORTAIS: guardar hash do token, nunca o token em texto puro.
create table if not exists public.erp_portal_acessos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  usuario_externo_id uuid not null references public.erp_usuarios(id) on delete cascade,
  tipo_portal varchar(20) not null check (tipo_portal in ('cliente','fornecedor')),
  token_hash text unique,
  ultimo_acesso timestamptz,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Índices de consulta e de isolamento por empresa.
create index if not exists idx_crm_oportunidades_empresa_estagio
  on public.erp_crm_oportunidades (empresa_id, estagio, data_fechamento_prevista);
create index if not exists idx_crm_oportunidades_cliente
  on public.erp_crm_oportunidades (empresa_id, cliente_id);
create index if not exists idx_crm_orcamentos_oportunidade
  on public.erp_crm_orcamentos (empresa_id, oportunidade_id);
create index if not exists idx_mrp_execucoes_empresa_data
  on public.erp_mrp_execucoes (empresa_id, created_at desc);
create index if not exists idx_mrp_sugestoes_execucao
  on public.erp_mrp_sugestoes (empresa_id, execucao_id);
create index if not exists idx_mrp_sugestoes_pendentes
  on public.erp_mrp_sugestoes (empresa_id, status, data_limite);
create index if not exists idx_mes_conectores_maquina
  on public.erp_mes_conectores (empresa_id, maquina_id);
create index if not exists idx_mes_telemetria_maquina_time
  on public.erp_mes_telemetria (empresa_id, maquina_id, "timestamp" desc);
create index if not exists idx_mes_telemetria_op
  on public.erp_mes_telemetria (empresa_id, ordem_producao_id) where ordem_producao_id is not null;
create index if not exists idx_bloco_k_estoque_periodo
  on public.erp_fiscal_bloco_k_estoque (empresa_id, periodo_referencia);
create index if not exists idx_bloco_k_producao_periodo
  on public.erp_fiscal_bloco_k_producao (empresa_id, periodo_referencia);
create index if not exists idx_portal_acessos_usuario
  on public.erp_portal_acessos (empresa_id, usuario_externo_id, tipo_portal);

-- RLS por tenant usando as funções já adotadas pelo ERP.
-- Master pode consultar/administrar registros existentes; INSERT continua
-- exigindo empresa ativa para não permitir criação com tenant arbitrário.
do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'erp_crm_oportunidades',
    'erp_crm_orcamentos',
    'erp_mrp_execucoes',
    'erp_mrp_sugestoes',
    'erp_mes_conectores',
    'erp_mes_telemetria',
    'erp_fiscal_bloco_k_estoque',
    'erp_fiscal_bloco_k_producao',
    'erp_portal_acessos'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    p := t || '_premium_select';
    execute format('drop policy if exists %I on public.%I', p, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())',
      p, t
    );

    p := t || '_premium_insert';
    execute format('drop policy if exists %I on public.%I', p, t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.erp_current_empresa_id() is not null and empresa_id = public.erp_current_empresa_id())',
      p, t
    );

    p := t || '_premium_update';
    execute format('drop policy if exists %I on public.%I', p, t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())',
      p, t
    );

    p := t || '_premium_delete';
    execute format('drop policy if exists %I on public.%I', p, t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())',
      p, t
    );
  end loop;
end $$;

grant select, insert, update, delete on
  public.erp_crm_oportunidades,
  public.erp_crm_orcamentos,
  public.erp_mrp_execucoes,
  public.erp_mrp_sugestoes,
  public.erp_mes_conectores,
  public.erp_mes_telemetria,
  public.erp_fiscal_bloco_k_estoque,
  public.erp_fiscal_bloco_k_producao,
  public.erp_portal_acessos
to authenticated;

grant usage, select on sequence public.erp_mes_telemetria_id_seq to authenticated;

commit;
