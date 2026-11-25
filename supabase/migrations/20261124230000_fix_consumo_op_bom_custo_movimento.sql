-- SYSNQRA ERP INDUSTRIAL
-- REV-CONTRATO-CONSUMO-OP-20261124-01
-- Corrige o contrato real entre BOM, consumo de OP e custeio.
-- Base validada no Supabase: erp_ficha_itens.componente_id existe;
-- erp_ficha_itens.produto_id e erp_estoque_movimentos.custo_unitario não existem.
-- Não altera saldos diretamente nem reescreve movimentos históricos.

ALTER TABLE public.erp_estoque_movimentos
  ADD COLUMN IF NOT EXISTS custo_unitario numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_total numeric(18,6) NOT NULL DEFAULT 0;

-- Preenche custo histórico apenas quando há custo médio conhecido no cadastro.
UPDATE public.erp_estoque_movimentos m
   SET custo_unitario = p.custo_medio,
       custo_total = round(m.quantidade * p.custo_medio, 6)
  FROM public.erp_produtos p
 WHERE p.id = m.produto_id
   AND p.empresa_id = m.empresa_id
   AND m.custo_unitario = 0
   AND p.custo_medio > 0
   AND m.tipo = 'consumo'
   AND m.origem = 'consumo_producao';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'erp_estoque_movimentos_custo_nao_negativo'
       AND conrelid = 'public.erp_estoque_movimentos'::regclass
  ) THEN
    ALTER TABLE public.erp_estoque_movimentos
      ADD CONSTRAINT erp_estoque_movimentos_custo_nao_negativo
      CHECK (custo_unitario >= 0 AND custo_total >= 0) NOT VALID;
  END IF;
END;
$$;

ALTER TABLE public.erp_estoque_movimentos
  VALIDATE CONSTRAINT erp_estoque_movimentos_custo_nao_negativo;

CREATE OR REPLACE FUNCTION public.erp_pcp_consumir_material_op(
  p_ordem_producao_id uuid,
  p_produto_id uuid,
  p_quantidade numeric,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_empresa uuid := public.erp_current_empresa_id();
  v_op record;
  v_prod record;
  v_ficha_id uuid;
  v_movimento uuid;
  v_custo_total numeric(18,6);
BEGIN
  IF auth.uid() IS NULL OR v_empresa IS NULL THEN
    RAISE EXCEPTION 'SESSAO_EMPRESA_NAO_IDENTIFICADA';
  END IF;

  IF NOT public.erp_has_permission('estoque', 'editar') THEN
    RAISE EXCEPTION 'SEM_PERMISSAO_PARA_CONSUMO_DE_MATERIAL';
  END IF;

  IF p_ordem_producao_id IS NULL OR p_produto_id IS NULL
     OR p_quantidade IS NULL OR p_quantidade <= 0
     OR p_quantidade::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'DADOS_DE_CONSUMO_INVALIDOS';
  END IF;

  SELECT o.id, o.numero_op, o.produto_id, o.status
    INTO v_op
    FROM public.erp_ordens_producao o
   WHERE o.id = p_ordem_producao_id
     AND o.empresa_id = v_empresa
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDEM_DE_PRODUCAO_NAO_ENCONTRADA_NA_EMPRESA';
  END IF;

  IF lower(coalesce(v_op.status, '')) IN ('cancelada', 'cancelado', 'concluida', 'concluído', 'encerrada') THEN
    RAISE EXCEPTION 'ORDEM_DE_PRODUCAO_NAO_ACEITA_CONSUMO';
  END IF;

  SELECT f.id
    INTO v_ficha_id
    FROM public.erp_fichas_tecnicas f
   WHERE f.empresa_id = v_empresa
     AND f.produto_id = v_op.produto_id
     AND f.ativa = true
   ORDER BY f.versao DESC
   LIMIT 1;

  IF v_ficha_id IS NULL THEN
    RAISE EXCEPTION 'FICHA_TECNICA_ATIVA_NAO_ENCONTRADA_PARA_A_OP';
  END IF;

  -- Contrato correto: a chave do componente na BOM é componente_id.
  IF NOT EXISTS (
    SELECT 1
      FROM public.erp_ficha_itens i
     WHERE i.empresa_id = v_empresa
       AND i.ficha_id = v_ficha_id
       AND i.componente_id = p_produto_id
  ) THEN
    RAISE EXCEPTION 'MATERIAL_NAO_PERTENCE_A_FICHA_TECNICA_ATIVA_DA_OP';
  END IF;

  SELECT p.id, p.estoque_atual, p.custo_medio
    INTO v_prod
    FROM public.erp_produtos p
   WHERE p.id = p_produto_id
     AND p.empresa_id = v_empresa
     AND p.ativo = true
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATERIAL_NAO_ENCONTRADO_NA_EMPRESA';
  END IF;

  IF coalesce(v_prod.estoque_atual, 0) < p_quantidade THEN
    RAISE EXCEPTION 'ESTOQUE_INSUFICIENTE_PARA_CONSUMO_DA_OP';
  END IF;

  IF coalesce(v_prod.custo_medio, 0) <= 0 THEN
    RAISE EXCEPTION 'CUSTO_MEDIO_DO_MATERIAL_NAO_CADASTRADO';
  END IF;

  v_custo_total := round(p_quantidade * v_prod.custo_medio, 6);

  INSERT INTO public.erp_estoque_movimentos (
    empresa_id, produto_id, tipo, quantidade,
    custo_unitario, custo_total, origem, documento,
    ordem_producao_id, observacao
  )
  VALUES (
    v_empresa, p_produto_id, 'consumo', p_quantidade,
    v_prod.custo_medio, v_custo_total, 'consumo_producao',
    v_op.numero_op, v_op.id,
    coalesce(
      nullif(btrim(p_observacao), ''),
      'Consumo real de material vinculado à OP ' || v_op.numero_op
    )
  )
  RETURNING id INTO v_movimento;

  RETURN jsonb_build_object(
    'movimento_id', v_movimento,
    'ordem_producao_id', v_op.id,
    'numero_op', v_op.numero_op,
    'produto_id', p_produto_id,
    'quantidade', p_quantidade,
    'custo_unitario', v_prod.custo_medio,
    'custo_total', v_custo_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.erp_pcp_consumir_material_op(uuid, uuid, numeric, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.erp_pcp_consumir_material_op(uuid, uuid, numeric, text)
  TO authenticated;

COMMENT ON COLUMN public.erp_estoque_movimentos.custo_unitario IS
  'Custo unitário congelado no evento de estoque; usado na apuração histórica da OP.';
COMMENT ON COLUMN public.erp_estoque_movimentos.custo_total IS
  'Custo total congelado no evento de estoque (quantidade x custo unitário).';
