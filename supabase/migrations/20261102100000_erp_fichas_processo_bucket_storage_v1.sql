/*
  Bucket de Storage das Fichas de Processo
  - As telas src/pages/FichasProcesso.tsx gravam foto da peça, desenho do molde e galeria do
    ferramental em supabase.storage.from('erp-fichas-processo').
  - Nenhuma migration anterior criava esse bucket: sem ele o upload falha com
    "Bucket not found" e a ficha fica sem imagens.
  - Pasta de primeiro nível = empresa_id (mesmo isolamento usado pelo bucket erp-produtos).
  - Bucket público, igual a erp-produtos: a tela guarda o getPublicUrl() na linha da ficha.
    Motivo técnico: createSignedUrl expira (30 dias) e a URL assinada gravada no jsonb
    quebra a ficha depois desse prazo; o cadastro de produtos já usa URL pública e não quebra.
  - Escrita restrita a usuários autenticados da própria empresa (foldername[1] = empresa atual).
*/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'erp-fichas-processo',
  'erp-fichas-processo',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = true,
    file_size_limit = 8388608,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "erp fichas processo upload tenant" on storage.objects;
create policy "erp fichas processo upload tenant"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'erp-fichas-processo'
  and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
);

drop policy if exists "erp fichas processo replace tenant" on storage.objects;
create policy "erp fichas processo replace tenant"
on storage.objects for update to authenticated
using (
  bucket_id = 'erp-fichas-processo'
  and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
)
with check (
  bucket_id = 'erp-fichas-processo'
  and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
);

drop policy if exists "erp fichas processo delete tenant" on storage.objects;
create policy "erp fichas processo delete tenant"
on storage.objects for delete to authenticated
using (
  bucket_id = 'erp-fichas-processo'
  and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
);
