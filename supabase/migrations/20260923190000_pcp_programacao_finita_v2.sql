-- PCP Industrial v2: programação finita por máquina, molde, ciclo e equipe
-- A migração amplia a programação existente sem substituir dados históricos.
ALTER TABLE IF EXISTS public.erp_pcp_programacoes
  ADD COLUMN IF NOT EXISTS molde_id uuid REFERENCES public.erp_moldes(id),
  ADD COLUMN IF NOT EXISTS operador_frente_id uuid REFERENCES public.erp_funcionarios(id),
  ADD COLUMN IF NOT EXISTS operador_atras_id uuid REFERENCES public.erp_funcionarios(id),
  ADD COLUMN IF NOT EXISTS turnos smallint NOT NULL DEFAULT 1 CHECK (turnos > 0),
  ADD COLUMN IF NOT EXISTS horas_turno numeric(8,2) NOT NULL DEFAULT 8 CHECK (horas_turno > 0),
  ADD COLUMN IF NOT EXISTS eficiencia_percent numeric(5,2) NOT NULL DEFAULT 85 CHECK (eficiencia_percent > 0 AND eficiencia_percent <= 100),
  ADD COLUMN IF NOT EXISTS ciclo_seg numeric(12,3) NOT NULL DEFAULT 0 CHECK (ciclo_seg >= 0),
  ADD COLUMN IF NOT EXISTS cavidades_ativas integer NOT NULL DEFAULT 1 CHECK (cavidades_ativas > 0),
  ADD COLUMN IF NOT EXISTS setup_min numeric(12,2) NOT NULL DEFAULT 0 CHECK (setup_min >= 0);

CREATE INDEX IF NOT EXISTS idx_erp_pcp_prog_maquina_inicio
  ON public.erp_pcp_programacoes (maquina_id, inicio_planejado, fim_planejado);

CREATE INDEX IF NOT EXISTS idx_erp_pcp_prog_molde_inicio
  ON public.erp_pcp_programacoes (molde_id, inicio_planejado, fim_planejado);

CREATE INDEX IF NOT EXISTS idx_erp_pcp_prog_operador_frente
  ON public.erp_pcp_programacoes (operador_frente_id, inicio_planejado, fim_planejado);

CREATE INDEX IF NOT EXISTS idx_erp_pcp_prog_operador_atras
  ON public.erp_pcp_programacoes (operador_atras_id, inicio_planejado, fim_planejado);