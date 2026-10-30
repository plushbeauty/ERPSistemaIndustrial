begin;

-- RPNC creation permission includes attaching the evidence submitted with that record.
-- Keep the existing tenant, ownership, private-bucket and RLS predicates unchanged.
drop policy if exists erp_qualidade_rpnc_evidencias_insert on public.erp_qualidade_rpnc_evidencias;
create policy erp_qualidade_rpnc_evidencias_insert
  on public.erp_qualidade_rpnc_evidencias for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and uploaded_by = auth.uid()
    and (
      public.erp_has_permission('qualidade', 'criar')
      or public.erp_has_permission('qualidade', 'editar')
    )
  );

drop policy if exists qualidade_evidencias_insert on storage.objects;
create policy qualidade_evidencias_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.id::text = (storage.foldername(name))[2]
        and r.empresa_id = public.erp_current_empresa_id()
        and (
          public.erp_has_permission('qualidade', 'criar')
          or public.erp_has_permission('qualidade', 'editar')
        )
    )
  );

commit;
