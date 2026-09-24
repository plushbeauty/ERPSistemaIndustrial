create table if not exists public.fiscal_nfes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete restrict,
  numero integer, serie integer not null default 1, modelo text not null default '55',
  tipo text not null default 'saida' check (tipo in ('entrada','saida')),
  ambiente text not null default 'homologacao' check (ambiente in ('homologacao','producao')),
  status text not null default 'rascunho' check (status in ('rascunho','em_processamento','autorizada','rejeitada','cancelada','denegada')),
  natureza_operacao text not null, cfop text, data_emissao timestamptz not null default now(), data_saida timestamptz,
  destinatario_nome text not null, destinatario_documento text not null, destinatario_ie text, destinatario_email text,
  destinatario_endereco text, destinatario_bairro text, destinatario_cep text, destinatario_cidade text, destinatario_uf text,
  modalidade_frete text not null default '0', transportadora text, placa text, uf_transportadora text,
  peso_liquido numeric(18,6) not null default 0, peso_bruto numeric(18,6) not null default 0, volumes numeric(18,6) not null default 0,
  valor_produtos numeric(18,2) not null default 0, valor_frete numeric(18,2) not null default 0, valor_desconto numeric(18,2) not null default 0,
  valor_outras_despesas numeric(18,2) not null default 0, base_icms numeric(18,2) not null default 0, valor_icms numeric(18,2) not null default 0,
  base_icms_st numeric(18,2) not null default 0, valor_icms_st numeric(18,2) not null default 0, valor_ipi numeric(18,2) not null default 0,
  valor_pis numeric(18,2) not null default 0, valor_cofins numeric(18,2) not null default 0, valor_total numeric(18,2) not null default 0,
  chave_acesso text, protocolo text, mensagem_sefaz text, created_by uuid references public.usuarios(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.fiscal_nfe_itens (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
  nfe_id uuid not null references public.fiscal_nfes(id) on delete cascade, item_numero integer not null,
  produto_id uuid references public.produtos(id), codigo_produto text not null, descricao_produto text not null,
  ncm text not null, cfop text not null, unidade text not null default 'UN', quantidade numeric(18,6) not null,
  valor_unitario numeric(18,6) not null default 0, valor_desconto numeric(18,2) not null default 0, valor_total numeric(18,2) not null default 0,
  origem text not null default '0', cst_icms text, aliquota_icms numeric(9,4) not null default 0, valor_icms numeric(18,2) not null default 0,
  aliquota_ipi numeric(9,4) not null default 0, valor_ipi numeric(18,2) not null default 0, aliquota_pis numeric(9,4) not null default 0,
  valor_pis numeric(18,2) not null default 0, aliquota_cofins numeric(9,4) not null default 0, valor_cofins numeric(18,2) not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (nfe_id,item_numero)
);
create index if not exists fiscal_nfes_empresa_status_idx on public.fiscal_nfes(empresa_id,status,created_at desc);
create index if not exists fiscal_nfe_itens_nfe_idx on public.fiscal_nfe_itens(nfe_id,item_numero);
alter table public.fiscal_nfes enable row level security;
alter table public.fiscal_nfe_itens enable row level security;
drop policy if exists fiscal_nfes_select on public.fiscal_nfes;
drop policy if exists fiscal_nfes_insert on public.fiscal_nfes;
drop policy if exists fiscal_nfes_update on public.fiscal_nfes;
drop policy if exists fiscal_nfe_itens_select on public.fiscal_nfe_itens;
drop policy if exists fiscal_nfe_itens_insert on public.fiscal_nfe_itens;
drop policy if exists fiscal_nfe_itens_update on public.fiscal_nfe_itens;
drop policy if exists fiscal_nfe_itens_delete on public.fiscal_nfe_itens;
create policy fiscal_nfes_select on public.fiscal_nfes for select to authenticated using (is_master_user() or empresa_id = current_empresa_id());
create policy fiscal_nfes_insert on public.fiscal_nfes for insert to authenticated with check (is_master_user() or empresa_id = current_empresa_id());
create policy fiscal_nfes_update on public.fiscal_nfes for update to authenticated using (is_master_user() or empresa_id = current_empresa_id()) with check (is_master_user() or empresa_id = current_empresa_id());
create policy fiscal_nfe_itens_select on public.fiscal_nfe_itens for select to authenticated using (is_master_user() or empresa_id = current_empresa_id());
create policy fiscal_nfe_itens_insert on public.fiscal_nfe_itens for insert to authenticated with check (is_master_user() or empresa_id = current_empresa_id());
create policy fiscal_nfe_itens_update on public.fiscal_nfe_itens for update to authenticated using (is_master_user() or empresa_id = current_empresa_id()) with check (is_master_user() or empresa_id = current_empresa_id());
create policy fiscal_nfe_itens_delete on public.fiscal_nfe_itens for delete to authenticated using (is_master_user() or empresa_id = current_empresa_id());