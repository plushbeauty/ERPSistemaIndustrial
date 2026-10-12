begin;

-- The procedure editor uploads approved DOCX templates to this private bucket.
insert into storage.buckets (id, name, public)
values ('erp-documentos-qualidade', 'erp-documentos-qualidade', false)
on conflict (id) do update set public = false;

drop policy if exists qualidade_storage_select on storage.objects;
drop policy if exists qualidade_storage_insert on storage.objects;
drop policy if exists qualidade_storage_update on storage.objects;
drop policy if exists qualidade_storage_delete on storage.objects;

-- Active users of the same tenant may download templates; writes are restricted
-- to active Quality/Admin users. Object paths must start with empresa_id.
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
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
        and (
          coalesce(u.is_master, false) = true
          or coalesce(u.nivel_admin, 0) >= 1
          or upper(coalesce(u.perfil, '')) like '%QUALIDADE%'
          or upper(coalesce(u.perfil, '')) like '%ADMIN%'
        )
    )
  );

create policy qualidade_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'erp-documentos-qualidade'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
        and (
          coalesce(u.is_master, false) = true
          or coalesce(u.nivel_admin, 0) >= 1
          or upper(coalesce(u.perfil, '')) like '%QUALIDADE%'
          or upper(coalesce(u.perfil, '')) like '%ADMIN%'
        )
    )
  )
  with check (
    bucket_id = 'erp-documentos-qualidade'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
        and (
          coalesce(u.is_master, false) = true
          or coalesce(u.nivel_admin, 0) >= 1
          or upper(coalesce(u.perfil, '')) like '%QUALIDADE%'
          or upper(coalesce(u.perfil, '')) like '%ADMIN%'
        )
    )
  );

create policy qualidade_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'erp-documentos-qualidade'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
        and (
          coalesce(u.is_master, false) = true
          or coalesce(u.nivel_admin, 0) >= 1
          or upper(coalesce(u.perfil, '')) like '%QUALIDADE%'
          or upper(coalesce(u.perfil, '')) like '%ADMIN%'
        )
    )
  );

commit;
