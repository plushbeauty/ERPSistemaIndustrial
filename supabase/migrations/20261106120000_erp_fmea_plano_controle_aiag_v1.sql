-- SYSNQRA ERP INDUSTRIAL — FMEA (AIAG) e Plano de Controle (AIAG) com QR Code
-- @AUTOR: FernandoSch
-- @DATA_REVISAO_APROVACAO: 2026-11-06
-- @REVISAO: REV-FMEA-PLANO-CONTROLE-20261106-01
-- @STATUS_APROVACAO: ORDEM MASTER DE EXECUCAO EM 2026-11-06 — "CPP digital e impresso com QR Code",
--   "FMEA" e "Inspeções / RPNC / Plano de Controle" integram a lista de módulos a concluir.
--
-- Fonte do modelo: pasta de trabalho enviada pelo proprietário em 2026-10-23
-- (FMEA-TAMPA VRLA AGM NOBREAK.xlsm), que tem exatamente duas abas: "FMEA" e "Plano de Controle",
-- no formato AIAG. As colunas abaixo reproduzem aquela pasta, campo a campo. Nada foi inventado.
--
-- Decisão de esquema (registrada para a auditoria):
--   * A tabela de linhas do FMEA continua sendo public.qualidade_fmea, que JÁ EXISTE na base viva e
--     é lida pelo sistema (qualidade/FMEA.tsx, QualidadeCentralTablet.tsx,
--     IndustrialDataWorkspace.tsx). Criar uma segunda tabela de FMEA
--     duplicaria a origem oficial, o que a ordem permanente dele proíbe.
--   * public.erp_fmea (migration 20260925133000_fmea_process_v1.sql) NÃO está aplicada na base viva
--     (probe: PGRST205) e nenhum arquivo do sistema a consulta. Ela fica marcada como superada por
--     esta migration; não é deletada aqui porque exclusão de tabela é operação destrutiva e exige
--     aprovação explícita do proprietário.
--   * Cabeçalho do FMEA e as duas tabelas do Plano de Controle são novas e usam o prefixo erp_.

-- ============================ CABEÇALHO DO FMEA (aba 1 da pasta do proprietário) ============================

create table if not exists public.erp_fmea_cabecalho (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero text not null,
  tipo text not null default 'processo' check (tipo in ('processo','produto','projeto')),
  pagina integer not null default 1,
  total_paginas integer not null default 1,
  codigo_peca text not null default '',
  codigo_peca_cliente text not null default '',
  nome_peca text not null default '',
  cliente_projeto text not null default '',
  fornecedor text not null default '',
  codigo_fornecedor text not null default '',
  areas_envolvidas text not null default '',
  equipe_principal text not null default '',
  contato_principal text not null default '',
  telefone text not null default '',
  data_primeira_emissao date,
  data_revisao date,
  aprovacao_engenharia_cliente text not null default '',
  aprovacao_qualidade_cliente text not null default '',
  aprovacao_fornecedor_planta text not null default '',
  outra_aprovacao text not null default '',
  status text not null default 'rascunho' check (status in ('rascunho','ativo','revisado','obsoleto')),
  versao integer not null default 1,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero, versao)
);

create index if not exists idx_erp_fmea_cabecalho_empresa
  on public.erp_fmea_cabecalho (empresa_id, status, data_revisao desc);

alter table public.erp_fmea_cabecalho enable row level security;
drop policy if exists erp_fmea_cabecalho_tenant on public.erp_fmea_cabecalho;
create policy erp_fmea_cabecalho_tenant on public.erp_fmea_cabecalho
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

-- ============================ LINHAS DO FMEA: colunas que faltavam na tabela viva ============================

alter table public.qualidade_fmea
  add column if not exists cabecalho_id uuid references public.erp_fmea_cabecalho(id) on delete set null,
  add column if not exists ordem integer not null default 1,
  add column if not exists funcao_requisito text not null default '',
  add column if not exists mecanismo_falha text not null default '',
  add column if not exists controle_prevencao text not null default '',
  add column if not exists controle_deteccao text not null default '',
  add column if not exists acao_recomendada text not null default '',
  add column if not exists acao_responsavel text not null default '',
  add column if not exists acao_prazo date,
  add column if not exists acao_tomada text not null default '',
  add column if not exists acao_resultado text not null default '',
  add column if not exists caracteristica_especial text not null default 'nenhuma'
    check (caracteristica_especial in ('nenhuma','critica','significativa','seguranca','regulatoria')),
  add column if not exists severidade_apos integer check (severidade_apos between 1 and 10),
  add column if not exists ocorrencia_apos integer check (ocorrencia_apos between 1 and 10),
  add column if not exists deteccao_apos integer check (deteccao_apos between 1 and 10),
  add column if not exists atualizado_por uuid;

-- NPR após a ação: mesma fórmula da planilha do proprietário (S × O × D), só que da releitura.
alter table public.qualidade_fmea
  add column if not exists npr_apos integer generated always as
    (coalesce(severidade_apos, severidade) * coalesce(ocorrencia_apos, ocorrencia) * coalesce(deteccao_apos, deteccao)) stored;

create index if not exists idx_qualidade_fmea_cabecalho
  on public.qualidade_fmea (cabecalho_id, ordem);

-- ============================ PLANO DE CONTROLE (aba 2 da pasta do proprietário) ============================

create table if not exists public.erp_plano_controle (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero text not null,
  tipo text not null default 'producao' check (tipo in ('prototipo','pre_lancamento','producao')),
  pagina integer not null default 1,
  total_paginas integer not null default 1,
  codigo_peca text not null default '',
  nome_peca text not null default '',
  fornecedor_planta text not null default '',
  codigo_fornecedor text not null default '',
  contato_principal text not null default '',
  telefone text not null default '',
  data_original date,
  data_revisao date,
  equipe_principal text not null default '',
  aprovacao_engenharia_cliente text not null default '',
  aprovacao_qualidade_cliente text not null default '',
  aprovacao_fornecedor_planta text not null default '',
  outra_aprovacao text not null default '',
  produto_id uuid,
  status text not null default 'rascunho' check (status in ('rascunho','ativo','revisado','obsoleto')),
  versao integer not null default 1,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero, versao)
);

create index if not exists idx_erp_plano_controle_empresa
  on public.erp_plano_controle (empresa_id, status, data_revisao desc);

alter table public.erp_plano_controle enable row level security;
drop policy if exists erp_plano_controle_tenant on public.erp_plano_controle;
create policy erp_plano_controle_tenant on public.erp_plano_controle
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

create table if not exists public.erp_plano_controle_linha (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  plano_id uuid not null references public.erp_plano_controle(id) on delete cascade,
  ordem integer not null default 1,
  item_numero text not null default '',
  processo_operacao_numero text not null default '',
  descricao_produto_processo text not null default '',
  caracteristica_especial text not null default '' check (caracteristica_especial in ('','critica','significativa','nenhuma')),
  maquina_dispositivo_ferramenta text not null default '',
  numero_controle text not null default '',
  metodo_manufatura text not null default '',
  padrao_avaliacao text not null default '',
  tecnica_medicao text not null default '',
  tamanho_amostra text not null default '',
  frequencia_amostra text not null default '',
  metodo_controle text not null default '',
  plano_reacao text not null default '',
  fmea_linha_id uuid references public.qualidade_fmea(id) on delete set null,
  inspecao_id uuid,
  atualizado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_erp_plano_controle_linha_plano
  on public.erp_plano_controle_linha (plano_id, ordem);
create index if not exists idx_erp_plano_controle_linha_empresa
  on public.erp_plano_controle_linha (empresa_id);

alter table public.erp_plano_controle_linha enable row level security;
drop policy if exists erp_plano_controle_linha_tenant on public.erp_plano_controle_linha;
create policy erp_plano_controle_linha_tenant on public.erp_plano_controle_linha
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

-- ============================ RPC: matriz FMEA completa (cabeçalho + linhas) ============================

create or replace function public.erp_fmea_matriz(p_cabecalho_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'cabecalho', coalesce((
      select to_jsonb(c) from public.erp_fmea_cabecalho c
      where c.id = p_cabecalho_id
        and (c.empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    ), 'null'::jsonb),
    'linhas', coalesce((
      select jsonb_agg(to_jsonb(f) order by f.ordem, f.created_at)
      from public.qualidade_fmea f
      where f.cabecalho_id = p_cabecalho_id
        and (f.empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.erp_fmea_matriz(uuid) from public;
grant execute on function public.erp_fmea_matriz(uuid) to authenticated;

-- ============================ RPC: risco consolidado do FMEA (sem dados inventados) ============================

create or replace function public.erp_fmea_resumo(p_cabecalho_id uuid)
returns table (
  total_linhas bigint,
  npr_maximo integer,
  npr_medio numeric,
  criticas bigint,
  acoes_abertas bigint,
  acoes_concluidas bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)::bigint as total_linhas,
    max(f.npr)::integer as npr_maximo,
    round(avg(f.npr), 1) as npr_medio,
    count(*) filter (where f.caracteristica_especial in ('critica','seguranca','regulatoria'))::bigint as criticas,
    count(*) filter (where lower(f.status_acao) in ('aberta','em_andamento'))::bigint as acoes_abertas,
    count(*) filter (where lower(f.status_acao) = 'concluida')::bigint as acoes_concluidas
  from public.qualidade_fmea f
  where f.cabecalho_id = p_cabecalho_id
    and f.empresa_id = public.erp_current_empresa_id();
$$;

revoke all on function public.erp_fmea_resumo(uuid) from public;
grant execute on function public.erp_fmea_resumo(uuid) to authenticated;

-- ============================ RPC: plano de controle completo ============================

create or replace function public.erp_plano_controle_matriz(p_plano_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'plano', coalesce((select to_jsonb(p) from public.erp_plano_controle p
      where p.id = p_plano_id
        and (p.empresa_id = public.erp_current_empresa_id() or public.erp_is_master())), 'null'::jsonb),
    'linhas', coalesce((select jsonb_agg(to_jsonb(l) order by l.ordem)
      from public.erp_plano_controle_linha l
      where l.plano_id = p_plano_id
        and (l.empresa_id = public.erp_current_empresa_id() or public.erp_is_master())), '[]'::jsonb)
  );
$$;

revoke all on function public.erp_plano_controle_matriz(uuid) from public;
grant execute on function public.erp_plano_controle_matriz(uuid) to authenticated;

-- ============================ Triggers de updated_at ============================
-- Defeito corrigido nesta revisão: a versão anterior deste bloco chamava
-- public.erp_set_updated_at(), que não é criada por NENHUM arquivo deste repo (grep: apenas uma
-- revogação em 20260912_security_performance_hardening.sql:24) e não é resolvível pela API
-- (probe 2026-11-06 com publishable key: PGRST202 "Could not find the function"). Como a função
-- nunca é definida aqui, aplica-la num banco novo daria falha no CREATE TRIGGER e a migration
-- inteira pararia. A função própria é criada abaixo, com nome exclusivo, para não sobrescrever
-- objeto de outro pacote que já use esse nome no banco vivo.

create or replace function public.erp_stdq_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.erp_stdq_touch_updated_at() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['erp_fmea_cabecalho','erp_plano_controle','erp_plano_controle_linha'] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$s
         for each row execute function public.erp_stdq_touch_updated_at()', t);
  end loop;
end $$;
