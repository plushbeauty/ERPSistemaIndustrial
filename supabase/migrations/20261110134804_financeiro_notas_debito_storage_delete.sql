-- Permite remover upload incompleto apenas dentro da pasta do tenant autenticado.
drop policy if exists financeiro_notas_debito_delete on storage.objects;
create policy financeiro_notas_debito_delete on storage.objects
for delete to authenticated using (
 bucket_id='financeiro-notas-debito'
 and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text
);