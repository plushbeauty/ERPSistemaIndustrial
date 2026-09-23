create table if not exists public.erp_documentos_qualidade_anexos (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade,
 categoria text not null default 'ANEXO',
 nome_arquivo text not null,
 storage_path text not null,
 mime_type text,
 tamanho bigint,
 versao_documento integer,
 obsoleto boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.erp_documentos_qualidade_anexos enable row level security;
drop policy if exists erp_documentos_qualidade_anexos_tenant on public.erp_documentos_qualidade_anexos;
create policy erp_documentos_qualidade_anexos_tenant on public.erp_documentos_qualidade_anexos for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create index if not exists idx_docq_anexos_doc on public.erp_documentos_qualidade_anexos(documento_id,obsoleto,created_at desc);