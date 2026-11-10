begin;
drop policy if exists financeiro_retificacoes_storage_delete on storage.objects;
create policy financeiro_retificacoes_storage_delete on storage.objects
  for delete to authenticated using (
    bucket_id='financeiro-retificacoes'
    and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text
  );
create index if not exists erp_financeiro_retificacoes_parcela_idx
  on public.erp_financeiro_retificacoes(parcela_id);
create index if not exists erp_financeiro_retificacoes_usuario_idx
  on public.erp_financeiro_retificacoes(usuario_id);
create index if not exists erp_financeiro_periodos_fechados_usuario_idx
  on public.erp_financeiro_periodos_fechados(fechado_por);
create index if not exists erp_instituicoes_financeiras_empresa_idx
  on public.erp_instituicoes_financeiras(empresa_id);
commit;