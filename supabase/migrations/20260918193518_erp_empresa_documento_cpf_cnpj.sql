-- Reconciliation for the production migration 20260918193518_erp_empresa_documento_cpf_cnpj.
-- The production database already contains these columns. This file restores the migration
-- artifact to Git so repository history matches the real database migration history.

ALTER TABLE public.erp_empresas
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS tipo_documento text;

UPDATE public.erp_empresas
SET documento = NULLIF(regexp_replace(cnpj, '\\D', '', 'g'), '')
WHERE documento IS NULL
  AND cnpj IS NOT NULL;

UPDATE public.erp_empresas
SET tipo_documento = CASE
  WHEN length(documento) = 11 THEN 'CPF'
  WHEN length(documento) = 14 THEN 'CNPJ'
  ELSE NULL
END
WHERE tipo_documento IS NULL
  AND documento IS NOT NULL;
