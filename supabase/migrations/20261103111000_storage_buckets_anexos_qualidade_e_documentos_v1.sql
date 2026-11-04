-- 20261103111000_storage_buckets_anexos_qualidade_e_documentos_v1.sql
-- Os buckets "erp-qualidade-anexos" (logotipo do Editor IT, anexos do Controle de Documentos e do GED,
-- desenho anexado do Certificado de Qualidade) e "erp-documentos" (anexo do Dashboard Comercial) são
-- usados pelo frontend, mas nenhuma migration do repo os cria nem cria policies de storage.objects para
-- eles — em um banco novo o upload falha com "bucket not found". Os outros buckets do sistema seguem o
-- padrão de 20261030210000_customer_debit_notes_pod.sql (insert on conflict + política por empresa no
-- primeiro segmento do caminho), e é esse padrão que reproduzo aqui.
-- Nada aqui apaga objetos existentes: é só criação de bucket e política de acesso.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('erp-qualidade-anexos', 'erp-qualidade-anexos', false, 20971520, array[
  'application/pdf','image/png','image/jpeg','image/webp','image/svg+xml',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv'
])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('erp-documentos', 'erp-documentos', false, 20971520, array[
  'application/pdf','image/png','image/jpeg','image/webp',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain','text/csv'
])
on conflict (id) do nothing;

drop policy if exists erp_qualidade_anexos_select_tenant on storage.objects;
create policy erp_qualidade_anexos_select_tenant on storage.objects
for select to authenticated
using (bucket_id='erp-qualidade-anexos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_qualidade_anexos_insert_tenant on storage.objects;
create policy erp_qualidade_anexos_insert_tenant on storage.objects
for insert to authenticated
with check (bucket_id='erp-qualidade-anexos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_qualidade_anexos_update_tenant on storage.objects;
create policy erp_qualidade_anexos_update_tenant on storage.objects
for update to authenticated
using (bucket_id='erp-qualidade-anexos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text)
with check (bucket_id='erp-qualidade-anexos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_qualidade_anexos_delete_tenant on storage.objects;
create policy erp_qualidade_anexos_delete_tenant on storage.objects
for delete to authenticated
using (bucket_id='erp-qualidade-anexos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_documentos_select_tenant on storage.objects;
create policy erp_documentos_select_tenant on storage.objects
for select to authenticated
using (bucket_id='erp-documentos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_documentos_insert_tenant on storage.objects;
create policy erp_documentos_insert_tenant on storage.objects
for insert to authenticated
with check (bucket_id='erp-documentos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_documentos_update_tenant on storage.objects;
create policy erp_documentos_update_tenant on storage.objects
for update to authenticated
using (bucket_id='erp-documentos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text)
with check (bucket_id='erp-documentos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_documentos_delete_tenant on storage.objects;
create policy erp_documentos_delete_tenant on storage.objects
for delete to authenticated
using (bucket_id='erp-documentos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

commit;
