-- Parâmetros de inspeção por produto.
-- Campos aditivos; preserva os campos e regras de qualidade existentes.
ALTER TABLE public.erp_produtos
  ADD COLUMN IF NOT EXISTS inspecao_entrada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inspecao_producao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inspecao_entrega boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requer_quarentena boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS modelo_inspecao_codigo varchar(10),
  ADD COLUMN IF NOT EXISTS amostragem_aql varchar(6),
  ADD COLUMN IF NOT EXISTS tipo_medicao_qualidade varchar(15),
  ADD COLUMN IF NOT EXISTS valor_minimo_qualidade numeric(18,6),
  ADD COLUMN IF NOT EXISTS valor_maximo_qualidade numeric(18,6),
  ADD COLUMN IF NOT EXISTS unidade_medida_qualidade varchar(3);

COMMENT ON COLUMN public.erp_produtos.inspecao_entrada IS 'Indica se o produto exige inspeção no recebimento.';
COMMENT ON COLUMN public.erp_produtos.inspecao_producao IS 'Indica se o produto exige inspeção durante a produção.';
COMMENT ON COLUMN public.erp_produtos.inspecao_entrega IS 'Indica se o produto exige inspeção antes da entrega.';
COMMENT ON COLUMN public.erp_produtos.requer_quarentena IS 'Indica que lotes sujeitos a reprovação devem seguir a regra de quarentena do fluxo de qualidade; não executa bloqueio sozinho.';
COMMENT ON COLUMN public.erp_produtos.modelo_inspecao_codigo IS 'Código referencial do modelo de inspeção definido pela empresa.';
COMMENT ON COLUMN public.erp_produtos.amostragem_aql IS 'Nível AQL referencial conforme procedimento de amostragem aprovado.';
COMMENT ON COLUMN public.erp_produtos.tipo_medicao_qualidade IS 'Tipo/característica de medição associado ao produto.';
COMMENT ON COLUMN public.erp_produtos.valor_minimo_qualidade IS 'Limite inferior de aceitação da característica de medição.';
COMMENT ON COLUMN public.erp_produtos.valor_maximo_qualidade IS 'Limite superior de aceitação da característica de medição.';
COMMENT ON COLUMN public.erp_produtos.unidade_medida_qualidade IS 'Unidade de medida da característica de qualidade.';
