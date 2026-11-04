-- SYSNQRA ERP INDUSTRIAL | SGQ | Permissão de anexos na abertura da RPNC
-- Corrige o fluxo de upload na pasta virtual {empresa_id}/rpnc_{numero_rpnc}.
-- A abertura exige permissão "criar"; manutenção/exclusão continua exigindo "editar".
begin;

drop policy if exists qualidade_evidencias_insert_protocolo on storage.objects;
create policy qualidade_evidencias_insert_protocolo on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1
      from public.erp_rpnc r
      where r.empresa_id = public.erp_current_empresa_id()
        and ('rpnc_' || r.numero_rpnc) = (storage.foldername(name))[2]
        and (
          public.erp_has_permission('qualidade', 'criar')
          or public.erp_has_permission('qualidade', 'editar')
        )
    )
  );

commit;
