-- SYSNQRA ERP & SGQ INDUSTRIAL
-- Revisão: 2026-10-20
-- Escopo: campos adicionais de rastreabilidade PCP para requisições de compra.
-- Segurança: preserva empresa_id e as políticas RLS já existentes; não altera dados históricos além do default da unidade.
ALTER TABLE public.erp_requisicoes_compra
  ADD COLUMN IF NOT EXISTS lote_destino_op text,
  ADD COLUMN IF NOT EXISTS maquina_recurso_id uuid REFERENCES public.erp_maquinas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS centro_custo text NOT NULL DEFAULT 'PRODUCAO',
  ADD COLUMN IF NOT EXISTS urgencia_prioridade text NOT NULL DEFAULT 'MEDIA',
  ADD COLUMN IF NOT EXISTS justificativa_uso text;

ALTER TABLE public.erp_requisicoes_compra_itens
  ADD COLUMN IF NOT EXISTS unidade_comercial text NOT NULL DEFAULT 'UN';

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_requisicoes_compra_centro_custo_chk'
      AND conrelid = 'public.erp_requisicoes_compra'::regclass
  ) THEN
    ALTER TABLE public.erp_requisicoes_compra
      ADD CONSTRAINT erp_requisicoes_compra_centro_custo_chk
      CHECK (centro_custo IN ('PRODUCAO','MANUTENCAO','ADMINISTRATIVO','QUALIDADE'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_requisicoes_compra_urgencia_chk'
      AND conrelid = 'public.erp_requisicoes_compra'::regclass
  ) THEN
    ALTER TABLE public.erp_requisicoes_compra
      ADD CONSTRAINT erp_requisicoes_compra_urgencia_chk
      CHECK (urgencia_prioridade IN ('BAIXA','MEDIA','ALTA','CRITICA'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'erp_requisicoes_compra_unidade_chk'
      AND conrelid = 'public.erp_requisicoes_compra_itens'::regclass
  ) THEN
    ALTER TABLE public.erp_requisicoes_compra_itens
      ADD CONSTRAINT erp_requisicoes_compra_unidade_chk
      CHECK (length(btrim(unidade_comercial)) BETWEEN 1 AND 20);
  END IF;
END
$migration$;

CREATE INDEX IF NOT EXISTS idx_erp_req_compra_empresa_lote_destino
  ON public.erp_requisicoes_compra (empresa_id, lote_destino_op)
  WHERE lote_destino_op IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_erp_req_compra_empresa_maquina
  ON public.erp_requisicoes_compra (empresa_id, maquina_recurso_id)
  WHERE maquina_recurso_id IS NOT NULL;

COMMENT ON COLUMN public.erp_requisicoes_compra.lote_destino_op IS
  'Lote mestre de destino ou ordem de produção vinculada à requisição.';
COMMENT ON COLUMN public.erp_requisicoes_compra.maquina_recurso_id IS
  'Recurso/máquina relacionado à necessidade de manutenção ou setup.';
COMMENT ON COLUMN public.erp_requisicoes_compra_itens.unidade_comercial IS
  'Unidade comercial da linha de material solicitada (ex.: UN, KG, M).';
