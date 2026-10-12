begin;

-- The revision workflow needs a nullable effective date while a revision is under review.
alter table public.erp_qualidade_documentos_editor
  alter column data_homologacao drop not null;

-- These fields are consumed by the existing revision lifecycle RPC and editor UI.
alter table public.erp_qualidade_documentos_editor
  add column if not exists setor_responsavel varchar(100) not null default 'QUALIDADE',
  add column if not exists status varchar(20) not null default 'VIGENTE',
  add column if not exists motivo_alteracao text;

-- Normalize pre-existing rows without changing their document contents or revision numbers.
update public.erp_qualidade_documentos_editor
set setor_responsavel = coalesce(nullif(trim(setor_responsavel), ''), 'QUALIDADE'),
    status = coalesce(nullif(trim(status), ''), 'VIGENTE')
where setor_responsavel is null
   or trim(setor_responsavel) = ''
   or status is null
   or trim(status) = '';

commit;
