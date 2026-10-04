/*
📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
- Arquivo: supabase/migrations/20260921131500_erp_solicitacoes_compra.sql
- Status Atual: Revisão 3 (Workflow de Compras)
- Total de Linhas Gerado: 30
- Assinatura de Entrada (Primeiros 3 Imports): SQL migration — não aplicável
- Regra de Negócio Incorporada: Solicitação de compra tenant-aware com fornecedor sugerido e RLS.
*/
create table if not exists public.erp_solicitacoes_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero bigint generated always as identity,
  descricao text not null,
  prioridade text not null default 'normal',
  requer_autorizacao boolean not null default true,
  status text not null default 'aguardando_autorizacao',
  email_destino text,
  observacoes text,
  fornecedor_id uuid references public.erp_fornecedores(id) on delete set null,
  autorizado_por uuid,
  autorizado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_solicitacoes_compra enable row level security;
create policy erp_solicitacoes_compra_select on public.erp_solicitacoes_compra for select to authenticated using (empresa_id=public.erp_current_empresa_id());
create policy erp_solicitacoes_compra_insert on public.erp_solicitacoes_compra for insert to authenticated with check (empresa_id=public.erp_current_empresa_id());
create policy erp_solicitacoes_compra_update on public.erp_solicitacoes_compra for update to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
create index if not exists idx_erp_solicitacoes_compra_empresa on public.erp_solicitacoes_compra(empresa_id);
create index if not exists idx_erp_solicitacoes_compra_fornecedor on public.erp_solicitacoes_compra(fornecedor_id);
/* Revisão 3 registrada após validação estrutural do arquivo. */