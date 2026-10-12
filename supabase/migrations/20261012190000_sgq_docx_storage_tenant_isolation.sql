begin;

-- The DOCX template bucket is private and must also be tenant-scoped.
-- Every object path follows <empresa_id>/... as enforced by the upload RPC and UI.
drop policy if exists qualidade_storage_select on storage.objects;
drop policy if exists qualidade_storage_insert on storage.objects;
drop policy if exists qualidade_storage_update on storage.objects;
drop policy if exists qualidade_storage_delete on storage.objects;

create policy qualidade_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'erp-documentos-qualidade'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );

create policy qualidade_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'erp-documentos-qualidade'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );

create policy qualidade_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'erp-documentos-qualidade'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  )
  with check (
    bucket_id = 'erp-documentos-qualidade'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );

create policy qualidade_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'erp-documentos-qualidade'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );

commit;
