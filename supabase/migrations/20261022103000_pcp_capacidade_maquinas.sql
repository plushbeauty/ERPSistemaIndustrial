-- SYSNQRA ERP — PCP: capacidade operacional cadastrada por máquina
-- Revisão: PCP-CAPACIDADE-002 | 2026-10-22
-- Sem dados fictícios e sem assumir turnos: novos campos ficam NULL até conferência do cadastro.
ALTER TABLE public.erp_maquinas
  ADD COLUMN IF NOT EXISTS horas_capacidade_dia numeric(5,2),
  ADD COLUMN IF NOT EXISTS dias_trabalho_semana integer;

ALTER TABLE public.erp_maquinas
  DROP CONSTRAINT IF EXISTS erp_maquinas_horas_capacidade_dia_check,
  ADD CONSTRAINT erp_maquinas_horas_capacidade_dia_check
    CHECK (horas_capacidade_dia IS NULL OR (horas_capacidade_dia > 0 AND horas_capacidade_dia <= 24)),
  DROP CONSTRAINT IF EXISTS erp_maquinas_dias_trabalho_semana_check,
  ADD CONSTRAINT erp_maquinas_dias_trabalho_semana_check
    CHECK (dias_trabalho_semana IS NULL OR dias_trabalho_semana BETWEEN 1 AND 7);

COMMENT ON COLUMN public.erp_maquinas.horas_capacidade_dia IS
  'Horas produtivas planejadas por dia para esta máquina; preencher e revisar conforme turnos reais da empresa.';
COMMENT ON COLUMN public.erp_maquinas.dias_trabalho_semana IS
  'Dias planejados de trabalho por semana para esta máquina; preencher conforme calendário real da empresa.';

CREATE INDEX IF NOT EXISTS idx_erp_maquinas_capacidade_empresa_ativo
  ON public.erp_maquinas (empresa_id, ativo);
