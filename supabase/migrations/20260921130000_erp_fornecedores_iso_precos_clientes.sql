/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: supabase/migrations/20260921130000_erp_fornecedores_iso_precos_clientes.sql
- Status Atual: Revisão 3 (Schema de Compras e Comercial)
- Total de Linhas Gerado: 96
- Assinatura de Entrada (Primeiros 3 Imports): SQL migration — não aplicável
- Regra de Negócio Incorporada: Fornecedores, ISO 9001 em Storage privado, tabelas de preços, desconto por cliente e função central de resolução de preço.
*/
create table if not exists public.erp_fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo text,
  razao_social text not null,
  nome_fantasia text,
  documento text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  contato text,
  ativo boolean not null default true,
  iso_9001_certificado boolean not null default false,
  iso_certificado_nome text,
  iso_certificado_path text,
  iso_certificado_validade date,
  iso_certificado_numero text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_erp_fornecedores_empresa on public.erp_fornecedores(empresa_id);
alter table public.erp_fornecedores enable row level security;
drop policy if exists erp_fornecedores_select on public.erp_fornecedores;
drop policy if exists erp_fornecedores_insert on public.erp_fornecedores;
drop policy if exists erp_fornecedores_update on public.erp_fornecedores;
drop policy if exists erp_fornecedores_delete on public.erp_fornecedores;
create policy erp_fornecedores_select on public.erp_fornecedores for select to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_fornecedores_insert on public.erp_fornecedores for insert to authenticated with check (empresa_id=public.erp_current_empresa_id());
create policy erp_fornecedores_update on public.erp_fornecedores for update to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
create policy erp_fornecedores_delete on public.erp_fornecedores for delete to authenticated using (empresa_id=public.erp_current_empresa_id());

create table if not exists public.erp_tabelas_preco (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id,codigo)
);
create table if not exists public.erp_tabelas_preco_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  tabela_preco_id uuid not null references public.erp_tabelas_preco(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete cascade,
  preco numeric(18,4) not null check(preco>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tabela_preco_id,produto_id)
);
alter table public.erp_clientes add column if not exists tabela_preco_id uuid references public.erp_tabelas_preco(id) on delete set null;
alter table public.erp_clientes add column if not exists desconto_padrao_percentual numeric(7,4) not null default 0 check(desconto_padrao_percentual between 0 and 100);
alter table public.erp_clientes add column if not exists tipo_cliente text;
alter table public.erp_tabelas_preco enable row level security;
alter table public.erp_tabelas_preco_itens enable row level security;
create policy erp_tabelas_preco_select on public.erp_tabelas_preco for select to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_insert on public.erp_tabelas_preco for insert to authenticated with check (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_update on public.erp_tabelas_preco for update to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_delete on public.erp_tabelas_preco for delete to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_itens_select on public.erp_tabelas_preco_itens for select to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_itens_insert on public.erp_tabelas_preco_itens for insert to authenticated with check (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_itens_update on public.erp_tabelas_preco_itens for update to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
create policy erp_tabelas_preco_itens_delete on public.erp_tabelas_preco_itens for delete to authenticated using (empresa_id=public.erp_current_empresa_id());
insert into storage.buckets(id,name,public) values('erp-fornecedor-certificados','erp-fornecedor-certificados',false) on conflict(id) do nothing;
drop policy if exists erp_supplier_cert_select on storage.objects;
drop policy if exists erp_supplier_cert_insert on storage.objects;
drop policy if exists erp_supplier_cert_update on storage.objects;
drop policy if exists erp_supplier_cert_delete on storage.objects;
create policy erp_supplier_cert_select on storage.objects for select to authenticated using (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text);
create policy erp_supplier_cert_insert on storage.objects for insert to authenticated with check (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text);
create policy erp_supplier_cert_update on storage.objects for update to authenticated using (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text) with check (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text);
create policy erp_supplier_cert_delete on storage.objects for delete to authenticated using (bucket_id='erp-fornecedor-certificados' and split_part(name,'/',1)=public.erp_current_empresa_id()::text);
create or replace function public.erp_preco_cliente_produto(p_cliente_id uuid,p_produto_id uuid)
returns numeric language sql stable security invoker set search_path=public
as $$
  select round(coalesce(i.preco,p.preco_venda,0)*(1-coalesce(c.desconto_padrao_percentual,0)/100),4)
  from public.erp_clientes c
  join public.erp_produtos p on p.id=p_produto_id and (p.empresa_id=c.empresa_id or p.empresa_id is null)
  left join public.erp_tabelas_preco_itens i on i.tabela_preco_id=c.tabela_preco_id and i.produto_id=p.id and i.empresa_id=c.empresa_id
  where c.id=p_cliente_id and c.empresa_id=public.erp_current_empresa_id();
$$;
revoke all on function public.erp_preco_cliente_produto(uuid,uuid) from public,anon;
grant execute on function public.erp_preco_cliente_produto(uuid,uuid) to authenticated;
/* Revisão 3 registrada após validação estrutural do arquivo. */