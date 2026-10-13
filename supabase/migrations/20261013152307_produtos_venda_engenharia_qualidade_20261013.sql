-- Cadastro mestre de produtos: especificação técnica, processo de fabricação e referências comerciais.
-- Todas as colunas são aditivas para preservar cadastros existentes e não alterar o fluxo fiscal atual.
ALTER TABLE public.erp_produtos
  ADD COLUMN IF NOT EXISTS cliente_principal text,
  ADD COLUMN IF NOT EXISTS codigo_cliente text,
  ADD COLUMN IF NOT EXISTS centro_custo_produto text,
  ADD COLUMN IF NOT EXISTS tipo_processo text NOT NULL DEFAULT 'NAO_APLICA',
  ADD COLUMN IF NOT EXISTS tipo_maquina text,
  ADD COLUMN IF NOT EXISTS tipo_injetora text,
  ADD COLUMN IF NOT EXISTS maquina_preferencial_id uuid REFERENCES public.erp_maquinas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tonelagem_minima numeric(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tonelagem_maxima numeric(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS numero_cavidades integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS molde_codigo text,
  ADD COLUMN IF NOT EXISTS numero_desenho text,
  ADD COLUMN IF NOT EXISTS especificacao_interna text,
  ADD COLUMN IF NOT EXISTS material_especificado text,
  ADD COLUMN IF NOT EXISTS dureza_especificada text,
  ADD COLUMN IF NOT EXISTS fluidez_especificada text,
  ADD COLUMN IF NOT EXISTS numero_ficha_processo text,
  ADD COLUMN IF NOT EXISTS numero_riai text;

CREATE INDEX IF NOT EXISTS idx_erp_produtos_maquina_preferencial
  ON public.erp_produtos(empresa_id,maquina_preferencial_id)
  WHERE maquina_preferencial_id IS NOT NULL;

COMMENT ON COLUMN public.erp_produtos.especificacao_interna IS 'Especificação técnica de compra e inspeção de recebimento do material.';
COMMENT ON COLUMN public.erp_produtos.numero_riai IS 'Número do Relatório de Inspeção de Amostra Inicial / aprovação do cliente.';
COMMENT ON COLUMN public.erp_produtos.maquina_preferencial_id IS 'Máquina preferencial cadastrada no módulo de Engenharia/PCP.';
COMMENT ON COLUMN public.erp_produtos.centro_custo_produto IS 'Código/identificação do centro de custo interno associado ao produto.';
