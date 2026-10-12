-- Indexes covering foreign keys introduced by the warehouse-to-NF-e flow.
create index if not exists idx_erp_liberacoes_nf_pedido_fk
  on public.erp_liberacoes_nf(pedido_venda_id,empresa_id);
create index if not exists idx_erp_liberacoes_nf_documento_fk
  on public.erp_liberacoes_nf(documento_fiscal_id,empresa_id);
create index if not exists idx_erp_liberacoes_nf_criado_por_fk
  on public.erp_liberacoes_nf(criado_por,empresa_id);
create index if not exists idx_erp_liberacoes_nf_encaminhado_por_fk
  on public.erp_liberacoes_nf(encaminhado_por,empresa_id);
create index if not exists idx_erp_liberacoes_nf_concluido_por_fk
  on public.erp_liberacoes_nf(concluido_por,empresa_id);
create index if not exists idx_erp_liberacoes_nf_itens_liberacao_fk
  on public.erp_liberacoes_nf_itens(liberacao_id,empresa_id);
create index if not exists idx_erp_liberacoes_nf_itens_lote_fk
  on public.erp_liberacoes_nf_itens(lote_id,empresa_id);
create index if not exists idx_erp_liberacoes_nf_itens_pedido_item_fk
  on public.erp_liberacoes_nf_itens(pedido_item_id,empresa_id);
create index if not exists idx_erp_liberacoes_nf_itens_produto_fk
  on public.erp_liberacoes_nf_itens(produto_id,empresa_id);
