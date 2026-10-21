-- REV-LOG-EXPEDICAO-ETIQUETAS-001 | 2026-10-21
-- Multiempresa: usar o resolvedor oficial do tenant; auth.uid() não é empresa_id.
begin;

create table if not exists public.erp_expedicao_nfe (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  numero_nfe integer not null check (numero_nfe > 0),
  chave_acesso varchar(44) not null check (chave_acesso ~ '^[0-9]{44}$'),
  tipo_fluxo varchar(10) not null check (tipo_fluxo in ('ENTRADA','SAIDA')),
  parceiro_comercial varchar(255) not null check (length(btrim(parceiro_comercial)) > 0),
  transportadora varchar(150),
  placa_veiculo varchar(10),
  status_expedicao varchar(30) not null default 'AGUARDANDO_CONFERENCIA'
    check (status_expedicao in ('AGUARDANDO_CONFERENCIA','LIBERADO','REJEITADO')),
  data_movimentacao timestamptz not null default now(),
  criado_por uuid default auth.uid()
);
create unique index if not exists uq_erp_expedicao_nfe_empresa_chave
  on public.erp_expedicao_nfe(empresa_id,chave_acesso);
create index if not exists idx_erp_expedicao_nfe_empresa_data
  on public.erp_expedicao_nfe(empresa_id,data_movimentacao desc);
alter table public.erp_expedicao_nfe enable row level security;
drop policy if exists erp_expedicao_nfe_select_tenant on public.erp_expedicao_nfe;
drop policy if exists erp_expedicao_nfe_insert_tenant on public.erp_expedicao_nfe;
drop policy if exists erp_expedicao_nfe_update_tenant on public.erp_expedicao_nfe;
create policy erp_expedicao_nfe_select_tenant on public.erp_expedicao_nfe
  for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_expedicao_nfe_insert_tenant on public.erp_expedicao_nfe
  for insert to authenticated with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_expedicao_nfe_update_tenant on public.erp_expedicao_nfe
  for update to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update on public.erp_expedicao_nfe to authenticated;

create table if not exists public.erp_log_etiquetas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo_produto varchar(50) not null,
  descricao_produto varchar(255) not null,
  numero_lote varchar(50) not null,
  numero_nfe integer check (numero_nfe is null or numero_nfe > 0),
  quantidade_pecas numeric(12,3) not null check (quantidade_pecas > 0),
  modelo_etiqueta varchar(50) not null check (modelo_etiqueta in ('PADRAO_INDUSTRIA','CAIXA_PALETE','INTERNO_PROCESSO')),
  operador_id uuid not null references auth.users(id),
  data_emissao date,
  data_impressao timestamptz not null default now()
);
create index if not exists idx_erp_log_etiquetas_empresa_data
  on public.erp_log_etiquetas(empresa_id,data_impressao desc);
create index if not exists idx_erp_log_etiquetas_empresa_lote
  on public.erp_log_etiquetas(empresa_id,numero_lote);
alter table public.erp_log_etiquetas enable row level security;
drop policy if exists erp_log_etiquetas_select_tenant on public.erp_log_etiquetas;
drop policy if exists erp_log_etiquetas_insert_tenant on public.erp_log_etiquetas;
create policy erp_log_etiquetas_select_tenant on public.erp_log_etiquetas
  for select to authenticated using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_log_etiquetas_insert_tenant on public.erp_log_etiquetas
  for insert to authenticated with check (
    empresa_id = public.erp_current_empresa_id() and operador_id = auth.uid()
  );
grant select, insert on public.erp_log_etiquetas to authenticated;

commit;
