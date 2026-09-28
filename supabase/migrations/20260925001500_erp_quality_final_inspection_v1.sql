/*
 REV-081 — Qualidade: inspeção final com identificação completa do produto/lote
*/
ALTER TABLE public.erp_inspecoes
  ADD COLUMN IF NOT EXISTS codigo_produto text,
  ADD COLUMN IF NOT EXISTS descricao_produto text,
  ADD COLUMN IF NOT EXISTS lote_codigo text,
  ADD COLUMN IF NOT EXISTS data_producao date,
  ADD COLUMN IF NOT EXISTS tipo_defeito text,
  ADD COLUMN IF NOT EXISTS defeitos_encontrados text;

CREATE INDEX IF NOT EXISTS idx_erp_inspecoes_empresa_lote
  ON public.erp_inspecoes (empresa_id, lote_codigo, created_at DESC);
