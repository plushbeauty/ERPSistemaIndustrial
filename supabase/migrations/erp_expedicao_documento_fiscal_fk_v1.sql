alter table public.erp_expedicao_notas drop constraint if exists erp_expedicao_notas_nota_fiscal_id_fkey;
alter table public.erp_expedicao_notas add constraint erp_expedicao_notas_documento_fiscal_id_fkey foreign key (nota_fiscal_id) references public.erp_documentos_fiscais(id) on delete restrict;
