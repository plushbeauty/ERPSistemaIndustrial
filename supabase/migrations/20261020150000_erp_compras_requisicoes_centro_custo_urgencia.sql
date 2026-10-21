-- Revisão Compras / Requisições — 20/10/2026
-- Adiciona rastreabilidade de centro de custo e urgência à tabela nativa.
-- O status canônico existente é public.erp_requisicoes_compra.status;
-- não criamos status_requisicao duplicado para evitar divergência de workflow.

alter table public.erp_requisicoes_compra
  add column if not exists centro_custo varchar(50),
  add column if not exists nivel_urgencia varchar(20) not null default 'MEDIA';

do $$
begin
  alter table public.erp_requisicoes_compra
    add constraint erp_requisicoes_compra_nivel_urgencia_chk
    check (nivel_urgencia in ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA'));
exception when duplicate_object then
  null;
end $$;

create index if not exists idx_erp_requisicoes_compra_empresa_urgencia_status
  on public.erp_requisicoes_compra (empresa_id, nivel_urgencia, status, created_at desc);
