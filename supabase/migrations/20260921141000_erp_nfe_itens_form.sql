/*
 * 📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
 * - Arquivo: supabase/migrations/20260921141000_erp_nfe_itens_form.sql
 * - Status Atual: Revisão 3 (Módulo Manufatura Conectado)
 * - Total de Linhas Gerado: 25
 * - Assinatura de Entrada (Primeiros 3 Imports): Não se aplica a SQL; validar DDL, FKs, índices e RLS.
 * - Regra de Negócio Incorporada: Itens de NF-e com NCM, CFOP, CST/CSOSN, ICMS/IPI e isolamento por empresa.
 */
create table if not exists public.erp_documentos_fiscais_itens (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 documento_id uuid not null references public.erp_documentos_fiscais(id) on delete cascade,
 produto_id uuid references public.erp_produtos(id),
 item_numero integer not null,
 codigo_produto text not null,
 descricao_produto text not null,
 ncm text,
 cfop text,
 cst_csosn text,
 unidade text not null default 'UN',
 quantidade numeric(18,6) not null check (quantidade > 0),
 valor_unitario numeric(18,6) not null check (valor_unitario >= 0),
 valor_total numeric(18,2) not null check (valor_total >= 0),
 icms_aliquota numeric(7,4),
 ipi_aliquota numeric(7,4),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.erp_documentos_fiscais_itens enable row level security;
drop policy if exists "erp_nfe_itens_tenant_isolation" on public.erp_documentos_fiscais_itens;
create policy "erp_nfe_itens_tenant_isolation" on public.erp_documentos_fiscais_itens for all to authenticated using ((empresa_id = erp_current_company_id()) or erp_is_master()) with check ((empresa_id = erp_current_company_id()) or erp_is_master());
create index if not exists idx_erp_nfe_itens_documento on public.erp_documentos_fiscais_itens(documento_id, empresa_id);
/* Revisão 3 registrada após validação estrutural do arquivo. */