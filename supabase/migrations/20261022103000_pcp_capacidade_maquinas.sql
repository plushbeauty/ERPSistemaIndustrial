-- SYSNQRA ERP — PCP: capacidade operacional cadastrada por máquina
-- Revisão: PCP-CAPACIDADE-001 | 2026-10-22
-- Sem dados fictícios: somente acrescenta campos ao cadastro real.
ALTER TABLE public.erp_maquinas
  ADD COLUMN IF NOT EXISTS horas_capacidade_dia numeric(5,2) NOT NULL DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS dias_trabalho_semana integer NOT NULL DEFAULT 5;

ALTER TABLE public.erp_maquinas
  DROP CONSTRAINT IF EXISTS erp_maquinas_horas_capacidade_dia_check,
  ADD CONSTRAINT erp_maquinas_horas_capacidade_dia_check
    CHECK (horas_capacidade_dia > 0 AND horas_capacidade_dia <= 24),
  DROP CONSTRAINT IF EXISTS erp_maquinas_dias_trabalho_semana_check,
  ADD CONSTRAINT erp_maquinas_dias_trabalho_semana_check
    CHECK (dias_trabalho_semana BETWEEN 1 AND 7);

COMMENT ON COLUMN public.erp_maquinas.horas_capacidade_dia IS
  'Horas produtivas planejadas por dia para esta máquina; revisar conforme calendário/turnos da empresa.';
COMMENT ON COLUMN public.erp_maquinas.dias_trabalho_semana IS
  'Dias planejados de trabalho por semana para esta máquina; revisar conforme calendário da empresa.';

CREATE INDEX IF NOT EXISTS idx_erp_maquinas_capacidade_empresa_ativo
  ON public.erp_maquinas (empresa_id, ativo);
