-- ============================================================================
-- REV-055 | 2026-10-18
-- Auditoria de aceite de convite no perfil ERP.
-- A data só é gravada pela Edge Function após OTP válido e convite vigente.
-- Não altera policies existentes: a Edge Function valida identidade e convite.
-- ============================================================================
begin;

alter table public.erp_usuarios
  add column if not exists convite_aceito_em timestamptz null;

comment on column public.erp_usuarios.convite_aceito_em is
  'Instante UTC em que o usuário validou o OTP e concluiu a ativação do convite.';

create index if not exists idx_erp_usuarios_convite_aceito_em
  on public.erp_usuarios (empresa_id, convite_aceito_em desc)
  where convite_aceito_em is not null;

commit;
