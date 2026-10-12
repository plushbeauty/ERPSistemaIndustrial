-- One fiscal document may be linked to at most one warehouse release.
create unique index if not exists ux_erp_liberacoes_nf_documento_unico
  on public.erp_liberacoes_nf(documento_fiscal_id)
  where documento_fiscal_id is not null;
