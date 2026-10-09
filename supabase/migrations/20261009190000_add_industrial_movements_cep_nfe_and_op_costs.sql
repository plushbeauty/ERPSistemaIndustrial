begin;

create table if not exists public.estoque_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  tipo text not null check (tipo in ('entrada_nf','requisicao_producao','retorno_producao','transferencia','ajuste_inventario')),
  produto_id uuid not null references public.engenharia_produtos(id),
  lote_id uuid not null references public.estoque_lotes(id),
  quantidade numeric(18,6) not null check (quantidade > 0),
  endereco_origem_id uuid references public.estoque_enderecos(id),
  endereco_destino_id uuid references public.estoque_enderecos(id),
  documento_origem text,
  responsavel_id uuid,
  ocorrido_em timestamptz not null default now(),
  observacoes text,
  created_at timestamptz not null default now(),
  check (endereco_origem_id is distinct from endereco_destino_id)
);

create table if not exists public.qualidade_cep_medicoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  produto_id uuid not null references public.engenharia_produtos(id),
  especificacao_id uuid references public.qualidade_especificacoes(id),
  inspecao_id uuid references public.qualidade_inspecoes(id),
  parametro text not null,
  amostra_numero integer not null check (amostra_numero > 0),
  valor_medido numeric(18,6) not null,
  nominal numeric(18,6) not null,
  limite_superior numeric(18,6) not null,
  limite_inferior numeric(18,6) not null,
  medido_em timestamptz not null default now(),
  operador_id uuid,
  created_at timestamptz not null default now(),
  check (limite_superior >= limite_inferior)
);

create table if not exists public.fiscal_nfe_saidas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  chave_acesso varchar(44) check (chave_acesso is null or chave_acesso ~ '^[0-9]{44}$'),
  numero text not null,
  serie text not null,
  cnpj_destinatario varchar(14) not null,
  razao_social_destinatario text not null,
  valor_total numeric(18,2) not null check (valor_total >= 0),
  itens jsonb not null check (jsonb_typeof(itens) = 'array' and jsonb_array_length(itens) > 0),
  status text not null default 'rascunho' check (status in ('rascunho','autorizada','rejeitada','cancelada')),
  emitida_em timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, numero, serie)
);

create table if not exists public.fiscal_custos_ordens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  ordem_producao_id uuid not null references public.pcp_ordens_producao(id),
  periodo date not null,
  custo_mp numeric(18,2) not null default 0 check (custo_mp >= 0),
  custo_mod numeric(18,2) not null default 0 check (custo_mod >= 0),
  custo_ggf numeric(18,2) not null default 0 check (custo_ggf >= 0),
  quantidade_produzida numeric(18,6) not null default 0 check (quantidade_produzida >= 0),
  custo_total numeric(18,2) generated always as (custo_mp + custo_mod + custo_ggf) stored,
  fechado_em timestamptz,
  created_at timestamptz not null default now(),
  unique (empresa_id, ordem_producao_id, periodo)
);

create index if not exists idx_estoque_movimentacoes_tenant_data on public.estoque_movimentacoes(empresa_id, ocorrido_em desc);
create index if not exists idx_cep_medicoes_tenant_item_data on public.qualidade_cep_medicoes(empresa_id, produto_id, medido_em desc);
create index if not exists idx_fiscal_nfe_saidas_tenant_data on public.fiscal_nfe_saidas(empresa_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['estoque_movimentacoes','qualidade_cep_medicoes','fiscal_nfe_saidas','fiscal_custos_ordens'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on public.%I', t);
    execute format('create policy tenant_isolation on public.%I using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id())', t);
  end loop;
end $$;

commit;
