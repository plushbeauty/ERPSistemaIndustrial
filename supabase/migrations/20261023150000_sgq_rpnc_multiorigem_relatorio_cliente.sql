-- SYSNQRA SGQ | RPNC multiorigem | revisão 2026-10-23
-- Migração aditiva: mantém os registros existentes em public.erp_rpnc.
begin;
alter table public.erp_rpnc
 add column if not exists sgq_tipo_registro text,
 add column if not exists sgq_cliente_id uuid,
 add column if not exists sgq_produto_id uuid,
 add column if not exists sgq_ordem_producao_id uuid,
 add column if not exists sgq_lote text,
 add column if not exists sgq_data_ocorrencia date,
 add column if not exists sgq_responsavel_id uuid,
 add column if not exists sgq_contencao text,
 add column if not exists sgq_acao_preventiva text,
 add column if not exists sgq_verificacao_eficacia text,
 add column if not exists sgq_data_prazo date,
 add column if not exists sgq_data_fechamento timestamptz,
 add column if not exists sgq_relatorio_cliente_em timestamptz,
 add column if not exists sgq_relatorio_cliente_versao integer not null default 1,
 add column if not exists sgq_reaberto_em timestamptz,
 add column if not exists sgq_reaberto_motivo text;
alter table public.erp_rpnc drop constraint if exists erp_rpnc_sgq_tipo_registro_check;
alter table public.erp_rpnc add constraint erp_rpnc_sgq_tipo_registro_check
 check (sgq_tipo_registro is null or sgq_tipo_registro in ('INTERNO','AUDITORIA_INTERNA','AUDITORIA_EXTERNA','RPNC_CLIENTE','RPNC_PROCESSO'));
create index if not exists idx_erp_rpnc_sgq_tipo_empresa on public.erp_rpnc(empresa_id,sgq_tipo_registro,status,criado_em desc);
create index if not exists idx_erp_rpnc_sgq_cliente on public.erp_rpnc(empresa_id,sgq_cliente_id,criado_em desc) where sgq_cliente_id is not null;
commit;