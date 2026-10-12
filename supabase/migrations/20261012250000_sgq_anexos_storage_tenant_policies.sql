begin;

-- This bucket stores SGQ attachments and logos separately from approved DOCX templates.
-- Keep it private and scope every operation to the authenticated company's folder.
insert into storage.buckets (id, name, public)
values ('erp-qualidade-anexos', 'erp-qualidade-anexos', false)
on conflict (id) do update set public = false;

drop policy if exists erp_qms_anexos_storage_select on storage.objects;
drop policy if exists erp_qms_anexos_storage_insert on storage.objects;
drop policy if exists erp_qms_anexos_storage_update on storage.objects;
drop policy if exists erp_qms_anexos_storage_delete on storage.objects;

create policy erp_qms_anexos_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'erp-qualidade-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );

create policy erp_qms_anexos_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'erp-qualidade-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1
      from public.erp_usuarios u
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

create policy erp_qms_anexos_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'erp-qualidade-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1
      from public.erp_usuarios u
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
    bucket_id = 'erp-qualidade-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1
      from public.erp_usuarios u
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

create policy erp_qms_anexos_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'erp-qualidade-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1
      from public.erp_usuarios u
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
