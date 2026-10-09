-- ERP Industrial: engineering, WMS, SGQ, PCP, fiscal costing and HR foundation.
-- Tenant isolation uses the ERP's established erp_current_empresa_id() contract.
begin;

create extension if not exists pgcrypto;

create table if not exists public.engenharia_produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  descricao_tecnica text not null,
  unidade_medida text not null,
  tipo_item text not null check (tipo_item in ('materia_prima','componente','subconjunto','produto_acabado','insumo_consumivel')),
  peso_liquido numeric(18,6) not null default 0 check (peso_liquido >= 0),
  peso_bruto numeric(18,6) not null default 0 check (peso_bruto >= 0),
  ncm varchar(8),
  desenho_url text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.engenharia_bom (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo_bom text not null,
  produto_pai_id uuid not null references public.engenharia_produtos(id),
  versao text not null default '1',
  status text not null default 'em_revisao' check (status in ('ativo','em_revisao','obsoleto')),
  vigente_desde date not null default current_date,
  vigente_ate date,
  observacoes text,
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo_bom, versao),
  check (vigente_ate is null or vigente_ate >= vigente_desde)
);

create table if not exists public.engenharia_bom_componentes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  bom_id uuid not null references public.engenharia_bom(id) on delete cascade,
  componente_id uuid not null references public.engenharia_produtos(id),
  quantidade_liquida numeric(18,6) not null check (quantidade_liquida > 0),
  perda_percentual numeric(9,4) not null default 0 check (perda_percentual >= 0 and perda_percentual < 100),
  tipo_perda text not null default 'mecanica' check (tipo_perda in ('mecanica','quimica','galvanica')),
  operacao_consumo text,
  quantidade_bruta numeric(18,6) generated always as (quantidade_liquida / (1 - perda_percentual / 100)) stored,
  created_at timestamptz not null default now(),
  unique (bom_id, componente_id)
);

create table if not exists public.estoque_enderecos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  descricao text,
  tipo text not null check (tipo in ('materia_prima','insumos','quarentena','produto_acabado','refugo')),
  rua text not null,
  prateleira text not null,
  nivel text not null,
  capacidade_peso numeric(18,3),
  capacidade_volume numeric(18,3),
  ativo boolean not null default true,
  unique (empresa_id, codigo),
  unique (empresa_id, rua, prateleira, nivel)
);

create table if not exists public.estoque_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  numero_lote text not null,
  fabricado_em date,
  validade_em date,
  certificado_qualidade text,
  status text not null default 'quarentena' check (status in ('liberado','bloqueado','quarentena')),
  custo_unitario numeric(18,6) not null default 0 check (custo_unitario >= 0),
  created_at timestamptz not null default now(),
  unique (empresa_id, produto_id, numero_lote)
);

create table if not exists public.estoque_saldos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  lote_id uuid not null references public.estoque_lotes(id),
  endereco_id uuid not null references public.estoque_enderecos(id),
  quantidade numeric(18,6) not null default 0 check (quantidade >= 0),
  custo_medio numeric(18,6) not null default 0 check (custo_medio >= 0),
  updated_at timestamptz not null default now(),
  unique (empresa_id, produto_id, lote_id, endereco_id)
);

create table if not exists public.qualidade_especificacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  revisao text not null,
  status text not null default 'rascunho' check (status in ('rascunho','ativa','obsoleta')),
  aprovada_em timestamptz,
  aprovador_id uuid,
  vigente_desde date not null default current_date,
  vigente_ate date,
  parametros jsonb not null default '[]'::jsonb check (jsonb_typeof(parametros) = 'array'),
  created_at timestamptz not null default now(),
  unique (empresa_id, produto_id, revisao),
  check (vigente_ate is null or vigente_ate >= vigente_desde)
);

create table if not exists public.qualidade_motivos_falha (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  descricao text not null,
  categoria text not null default 'processo',
  ativo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists public.qualidade_inspecoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  tipo text not null check (tipo in ('recebimento','processo','produto_final')),
  produto_id uuid not null references public.engenharia_produtos(id),
  lote_id uuid not null references public.estoque_lotes(id),
  ordem_producao_id uuid,
  ordem_compra_id uuid,
  quantidade_total numeric(18,6) not null check (quantidade_total >= 0),
  tamanho_amostra integer not null check (tamanho_amostra >= 0),
  medicoes jsonb not null default '[]'::jsonb check (jsonb_typeof(medicoes) = 'array'),
  resultado text not null check (resultado in ('aprovado','reprovado','aprovado_com_restricao')),
  inspetor_id uuid,
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.qualidade_rnc_capa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  lote_id uuid references public.estoque_lotes(id),
  inspecao_id uuid references public.qualidade_inspecoes(id),
  origem text not null check (origem in ('fornecedor','interna','cliente')),
  descricao text not null,
  evidencia_urls text[] not null default '{}',
  disposicao text check (disposicao in ('refugar','devolver','retrabalhar','concessao')),
  cinco_porques jsonb not null default '[]'::jsonb,
  ishikawa jsonb not null default '{}'::jsonb,
  plano_5w2h jsonb not null default '[]'::jsonb,
  status text not null default 'aberto' check (status in ('aberto','em_execucao','concluido','eficacia_validada')),
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

create table if not exists public.qualidade_fmea (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo_item_processo text not null,
  funcao text not null,
  modo_falha text not null,
  efeito text not null,
  severidade integer not null check (severidade between 1 and 10),
  causa text not null,
  ocorrencia integer not null check (ocorrencia between 1 and 10),
  controles text,
  deteccao integer not null check (deteccao between 1 and 10),
  npr integer generated always as (severidade * ocorrencia * deteccao) stored,
  acoes_recomendadas jsonb not null default '[]'::jsonb,
  status_acao text not null default 'aberta',
  created_at timestamptz not null default now()
);

create table if not exists public.pcp_roteiros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  codigo text not null,
  versao text not null default '1',
  etapas jsonb not null default '[]'::jsonb check (jsonb_typeof(etapas) = 'array'),
  ativo boolean not null default true,
  unique (empresa_id, codigo, versao)
);

create table if not exists public.pcp_ordens_producao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  numero text not null,
  produto_id uuid not null references public.engenharia_produtos(id),
  roteiro_id uuid references public.pcp_roteiros(id),
  quantidade_planejada numeric(18,6) not null check (quantidade_planejada > 0),
  aberta_em timestamptz not null default now(),
  entrega_prevista date,
  status text not null default 'planejada' check (status in ('planejada','liberada','em_andamento','suspensa','encerrada','cancelada')),
  created_at timestamptz not null default now(),
  unique (empresa_id, numero)
);

create table if not exists public.pcp_apontamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  ordem_producao_id uuid not null references public.pcp_ordens_producao(id),
  operacao_codigo text not null,
  operador_id uuid,
  centro_trabalho text not null,
  setup_inicio timestamptz,
  setup_fim timestamptz,
  producao_inicio timestamptz,
  producao_fim timestamptz,
  pecas_boas numeric(18,6) not null default 0 check (pecas_boas >= 0),
  pecas_refugadas numeric(18,6) not null default 0 check (pecas_refugadas >= 0),
  motivo_refugo_id uuid references public.qualidade_motivos_falha(id),
  motivo_parada text,
  observacoes text,
  created_at timestamptz not null default now(),
  check (setup_fim is null or setup_inicio is null or setup_fim >= setup_inicio),
  check (producao_fim is null or producao_inicio is null or producao_fim >= producao_inicio)
);

create table if not exists public.fiscal_parametros_tributarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  cfop varchar(4) not null,
  ncm_sufixo text,
  uf_origem char(2),
  uf_destino char(2),
  aliquota_icms numeric(7,4) not null default 0 check (aliquota_icms between 0 and 100),
  aliquota_ipi numeric(7,4) not null default 0 check (aliquota_ipi between 0 and 100),
  aliquota_pis numeric(7,4) not null default 0 check (aliquota_pis between 0 and 100),
  aliquota_cofins numeric(7,4) not null default 0 check (aliquota_cofins between 0 and 100),
  cst_csosn text,
  tipo_operacao text not null check (tipo_operacao in ('entrada_compra','entrada_devolucao','saida_venda','saida_remessa')),
  ativo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists public.fiscal_nfe_entradas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  chave_acesso varchar(44) not null check (chave_acesso ~ '^[0-9]{44}$'),
  numero text not null,
  serie text not null,
  cnpj_emitente varchar(14) not null,
  razao_social_emitente text not null,
  valor_total numeric(18,2) not null check (valor_total >= 0),
  itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) > 0),
  status text not null default 'rascunho' check (status in ('rascunho','escriturada','cancelada')),
  escriturada_em timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, chave_acesso)
);

create table if not exists public.fiscal_historico_custos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  lote_id uuid references public.estoque_lotes(id),
  documento_origem text not null,
  quantidade numeric(18,6) not null check (quantidade > 0),
  valor_liquido_unitario numeric(18,6) not null check (valor_liquido_unitario >= 0),
  saldo_anterior numeric(18,6) not null,
  custo_medio_anterior numeric(18,6) not null,
  custo_medio_novo numeric(18,6) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rh_funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  matricula text not null,
  nome_completo text not null,
  cpf varchar(11),
  rg text,
  data_admissao date not null,
  cargo text not null,
  departamento text not null check (departamento in ('engenharia','pcp','producao','qualidade','almoxarifado','administrativo')),
  taxa_horaria numeric(18,4) not null default 0 check (taxa_horaria >= 0),
  status text not null default 'ativo' check (status in ('ativo','afastado','desligado')),
  created_at timestamptz not null default now(),
  unique (empresa_id, matricula)
);

create table if not exists public.rh_turnos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  nome text not null,
  inicio time not null,
  termino time not null,
  intervalo_inicio time,
  intervalo_fim time,
  escala text not null check (escala in ('5x2','6x2','12x36')),
  carga_horaria_mensal numeric(8,2) not null check (carga_horaria_mensal > 0),
  ativo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists public.rh_funcionario_turnos (
  empresa_id uuid not null default public.erp_current_empresa_id(),
  funcionario_id uuid not null references public.rh_funcionarios(id) on delete cascade,
  turno_id uuid not null references public.rh_turnos(id) on delete cascade,
  vigente_desde date not null default current_date,
  vigente_ate date,
  primary key (empresa_id, funcionario_id, turno_id, vigente_desde),
  check (vigente_ate is null or vigente_ate >= vigente_desde)
);

create table if not exists public.rh_epis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  codigo text not null,
  nome text not null,
  numero_ca text not null,
  ca_valido_ate date not null,
  periodicidade_troca_dias integer not null check (periodicidade_troca_dias > 0),
  ativo boolean not null default true,
  unique (empresa_id, codigo)
);

create table if not exists public.rh_entregas_epis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  epi_id uuid not null references public.rh_epis(id),
  funcionario_id uuid not null references public.rh_funcionarios(id),
  quantidade integer not null check (quantidade > 0),
  entregue_em date not null default current_date,
  confirmado_em timestamptz,
  proxima_troca_em date generated always as (entregue_em + periodicidade_troca_dias) stored,
  periodicidade_troca_dias integer not null check (periodicidade_troca_dias > 0)
);

create or replace function public.erp_quality_quarantine_lot()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quarantine_id uuid;
  v_rnc_code text;
begin
  if new.resultado = 'reprovado' then
    update public.estoque_lotes
       set status = 'bloqueado'
     where id = new.lote_id and empresa_id = new.empresa_id;

    select id into v_quarantine_id
      from public.estoque_enderecos
     where empresa_id = new.empresa_id and tipo = 'quarentena' and ativo
     order by codigo limit 1;

    if v_quarantine_id is null then
      raise exception 'QUARENTENA_ENDERECO_NAO_CONFIGURADO: cadastre um endereço ativo do tipo quarentena antes de reprovar lotes';
    end if;

    update public.estoque_saldos
       set endereco_id = v_quarantine_id, updated_at = now()
     where lote_id = new.lote_id and empresa_id = new.empresa_id;

    v_rnc_code := 'RNC-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    insert into public.qualidade_rnc_capa
      (empresa_id, codigo, lote_id, inspecao_id, origem, descricao, status)
    values
      (new.empresa_id, v_rnc_code, new.lote_id, new.id, 'interna',
       coalesce(nullif(new.observacoes, ''), 'Lote reprovado em inspeção de qualidade.'), 'aberto');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_qualidade_inspecao_quarentena on public.qualidade_inspecoes;
create trigger trg_qualidade_inspecao_quarentena
after insert or update of resultado on public.qualidade_inspecoes
for each row when (new.resultado = 'reprovado')
execute function public.erp_quality_quarantine_lot();

create or replace function public.erp_registrar_custo_medio_nfe(
  p_produto_id uuid,
  p_lote_id uuid,
  p_endereco_id uuid,
  p_quantidade numeric,
  p_valor_liquido_unitario numeric,
  p_documento_origem text
) returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_saldo numeric(18,6);
  v_custo numeric(18,6);
  v_novo_custo numeric(18,6);
begin
  if p_quantidade <= 0 or p_valor_liquido_unitario < 0 then
    raise exception 'QUANTIDADE_OU_CUSTO_INVALIDO';
  end if;

  perform 1 from public.estoque_lotes
   where id = p_lote_id and produto_id = p_produto_id and empresa_id = v_empresa_id
   for update;
  if not found then raise exception 'LOTE_NAO_ENCONTRADO_NO_TENANT'; end if;

  select coalesce(sum(quantidade), 0), coalesce(
    sum(quantidade * custo_medio) / nullif(sum(quantidade), 0), 0
  )
  into v_saldo, v_custo
  from public.estoque_saldos
  where produto_id = p_produto_id and empresa_id = v_empresa_id
  for update;

  v_novo_custo := case when v_saldo + p_quantidade = 0 then 0
    else ((v_saldo * v_custo) + (p_quantidade * p_valor_liquido_unitario)) / (v_saldo + p_quantidade)
  end;

  insert into public.estoque_saldos
    (empresa_id, produto_id, lote_id, endereco_id, quantidade, custo_medio, updated_at)
  values (v_empresa_id, p_produto_id, p_lote_id, p_endereco_id, p_quantidade, v_novo_custo, now())
  on conflict (empresa_id, produto_id, lote_id, endereco_id)
  do update set quantidade = public.estoque_saldos.quantidade + excluded.quantidade,
                custo_medio = v_novo_custo,
                updated_at = now();

  update public.estoque_lotes set custo_unitario = p_valor_liquido_unitario
   where id = p_lote_id and empresa_id = v_empresa_id;

  insert into public.fiscal_historico_custos
    (empresa_id, produto_id, lote_id, documento_origem, quantidade, valor_liquido_unitario,
     saldo_anterior, custo_medio_anterior, custo_medio_novo)
  values (v_empresa_id, p_produto_id, p_lote_id, p_documento_origem, p_quantidade,
          p_valor_liquido_unitario, v_saldo, v_custo, v_novo_custo);
  return v_novo_custo;
end;
$$;

create index if not exists idx_estoque_saldos_empresa_produto on public.estoque_saldos (empresa_id, produto_id);
create index if not exists idx_estoque_saldos_lote on public.estoque_saldos (empresa_id, lote_id);
create index if not exists idx_qualidade_inspecoes_lote on public.qualidade_inspecoes (empresa_id, lote_id, created_at desc);
create index if not exists idx_qualidade_rnc_status on public.qualidade_rnc_capa (empresa_id, status, created_at desc);
create index if not exists idx_pcp_op_status on public.pcp_ordens_producao (empresa_id, status, entrega_prevista);

do $$
declare t text;
begin
  foreach t in array array[
    'engenharia_produtos','engenharia_bom','engenharia_bom_componentes',
    'estoque_enderecos','estoque_lotes','estoque_saldos',
    'qualidade_especificacoes','qualidade_motivos_falha','qualidade_inspecoes','qualidade_rnc_capa','qualidade_fmea',
    'pcp_roteiros','pcp_ordens_producao','pcp_apontamentos',
    'fiscal_parametros_tributarios','fiscal_nfe_entradas','fiscal_historico_custos',
    'rh_funcionarios','rh_turnos','rh_funcionario_turnos','rh_epis','rh_entregas_epis'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format('create policy tenant_isolation on public.%I using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id())', t);
  end loop;
end $$;

commit;
