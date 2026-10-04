create sequence if not exists public.erp_pdv_vendas_numero_seq;

create table if not exists public.erp_caixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  codigo text not null,
  descricao text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique(empresa_id,codigo)
);

create table if not exists public.erp_caixas_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  caixa_id uuid not null references public.erp_caixas(id),
  numero bigint not null default nextval('public.erp_pdv_vendas_numero_seq'),
  operador_id uuid null references public.erp_usuarios(id),
  cliente_id uuid null references public.erp_clientes(id),
  subtotal numeric(18,2) not null default 0,
  desconto numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  forma_pagamento text not null,
  status text not null default 'FINALIZADA',
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.erp_caixas_movimentos_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  movimento_id uuid not null references public.erp_caixas_movimentos(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  descricao text not null,
  quantidade numeric(18,4) not null check (quantidade > 0),
  valor_unitario numeric(18,4) not null default 0,
  desconto numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0
);

create table if not exists public.erp_rfq (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  numero bigint not null default nextval('public.erp_pdv_vendas_numero_seq'),
  status text not null default 'RASCUNHO',
  data_emissao date not null default current_date,
  data_necessidade date,
  condicao_pagamento text,
  prazo_resposta date,
  observacoes text,
  created_by uuid null references public.erp_usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_rfq_fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  rfq_id uuid not null references public.erp_rfq(id) on delete cascade,
  fornecedor_id uuid not null references public.erp_fornecedores(id),
  status text not null default 'SELECIONADO',
  resposta_recebida_em timestamptz
);

create table if not exists public.erp_rfq_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  rfq_id uuid not null references public.erp_rfq(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  descricao text not null,
  codigo text not null,
  quantidade numeric(18,4) not null check (quantidade > 0),
  unidade text not null default 'UN',
  data_necessidade date,
  observacoes text
);

create index if not exists idx_erp_caixas_empresa on public.erp_caixas(empresa_id);
create index if not exists idx_erp_caixas_mov_empresa on public.erp_caixas_movimentos(empresa_id,created_at desc);
create index if not exists idx_erp_caixas_itens_mov on public.erp_caixas_movimentos_itens(movimento_id);
create index if not exists idx_erp_rfq_empresa on public.erp_rfq(empresa_id,created_at desc);
create index if not exists idx_erp_rfq_fornecedores_rfq on public.erp_rfq_fornecedores(rfq_id);
create index if not exists idx_erp_rfq_itens_rfq on public.erp_rfq_itens(rfq_id);

alter table public.erp_caixas enable row level security;
alter table public.erp_caixas_movimentos enable row level security;
alter table public.erp_caixas_movimentos_itens enable row level security;
alter table public.erp_rfq enable row level security;
alter table public.erp_rfq_fornecedores enable row level security;
alter table public.erp_rfq_itens enable row level security;

drop policy if exists erp_caixas_tenant on public.erp_caixas;
create policy erp_caixas_tenant on public.erp_caixas for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_caixas_mov_tenant on public.erp_caixas_movimentos;
create policy erp_caixas_mov_tenant on public.erp_caixas_movimentos for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_caixas_itens_tenant on public.erp_caixas_movimentos_itens;
create policy erp_caixas_itens_tenant on public.erp_caixas_movimentos_itens for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_rfq_tenant on public.erp_rfq;
create policy erp_rfq_tenant on public.erp_rfq for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_rfq_fornecedores_tenant on public.erp_rfq_fornecedores;
create policy erp_rfq_fornecedores_tenant on public.erp_rfq_fornecedores for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_rfq_itens_tenant on public.erp_rfq_itens;
create policy erp_rfq_itens_tenant on public.erp_rfq_itens for all to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select,insert,update,delete on public.erp_caixas,public.erp_caixas_movimentos,public.erp_caixas_movimentos_itens,public.erp_rfq,public.erp_rfq_fornecedores,public.erp_rfq_itens to authenticated;
