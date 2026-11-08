-- SYSNQRA ERP INDUSTRIAL
-- REV-CUSTO-OP-REAL-20261108-01
-- Reusa erp_custos_produtos e erp_custos_componentes como fonte única.
-- erp_financeiro_custo_op é uma view compatível, não uma segunda tabela de custos.

ALTER TABLE public.erp_custos_produtos
  ADD COLUMN IF NOT EXISTS status_apuracao text NOT NULL DEFAULT 'ABERTO',
  ADD COLUMN IF NOT EXISTS revisao_apuracao integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receita_estimada numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS apurado_em timestamptz,
  ADD COLUMN IF NOT EXISTS apurado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'erp_custos_produtos_status_apuracao_check'
       AND conrelid = 'public.erp_custos_produtos'::regclass
  ) THEN
    ALTER TABLE public.erp_custos_produtos
      ADD CONSTRAINT erp_custos_produtos_status_apuracao_check
      CHECK (status_apuracao IN ('ABERTO', 'APURADO', 'APURADO_SEM_PRECO', 'APURADO_PARCIAL', 'CANCELADO'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_erp_custos_produtos_empresa_op_real
  ON public.erp_custos_produtos (empresa_id, ordem_producao_id, created_at DESC)
  WHERE ordem_producao_id IS NOT NULL AND tipo_calculo = 'REAL';

CREATE INDEX IF NOT EXISTS idx_erp_estoque_movimentos_empresa_op_consumo
  ON public.erp_estoque_movimentos (empresa_id, ordem_producao_id, created_at DESC)
  WHERE ordem_producao_id IS NOT NULL AND tipo = 'consumo' AND origem = 'consumo_producao';

CREATE OR REPLACE VIEW public.erp_financeiro_custo_op
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.empresa_id,
  c.ordem_producao_id,
  c.produto_id,
  c.tipo_calculo,
  c.status_apuracao,
  c.revisao_apuracao,
  c.materiais AS custo_material,
  c.mao_obra AS custo_mao_obra,
  (c.maquinas + c.energia + c.custos_indiretos + c.terceirizacao + c.embalagem + c.perdas_refugo) AS custo_overhead,
  c.custo_total,
  c.custo_fabricacao,
  c.quantidade_base AS quantidade_produzida,
  c.preco_venda AS preco_venda_unitario,
  c.receita_estimada,
  c.margem_valor,
  c.margem_percentual,
  CASE WHEN c.quantidade_base > 0 THEN c.custo_total / c.quantidade_base ELSE NULL END AS custo_unitario,
  c.apurado_em,
  c.apurado_por,
  c.created_at
FROM public.erp_custos_produtos c
WHERE c.ordem_producao_id IS NOT NULL
  AND c.tipo_calculo = 'REAL';

COMMENT ON VIEW public.erp_financeiro_custo_op IS
  'Contrato de consulta de custo real por OP, respaldado pela fonte única erp_custos_produtos; evita duplicar o ledger industrial de custos.';

GRANT SELECT ON public.erp_financeiro_custo_op TO authenticated;

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
  IF NOT EXISTS (
    SELECT 1
      FROM public.erp_ficha_itens i
     WHERE i.ficha_id = v_ficha_id
       AND i.produto_id = p_produto_id
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

  INSERT INTO public.erp_estoque_movimentos (
    empresa_id, produto_id, tipo, quantidade, custo_unitario,
    origem, documento, ordem_producao_id, observacao
  )
  VALUES (
    v_empresa, p_produto_id, 'consumo', p_quantidade, v_prod.custo_medio,
    'consumo_producao', v_op.numero_op, v_op.id,
    coalesce(nullif(btrim(p_observacao), ''), 'Consumo real de material vinculado à OP ' || v_op.numero_op)
  )
  RETURNING id INTO v_movimento;

  RETURN jsonb_build_object(
    'movimento_id', v_movimento,
    'ordem_producao_id', v_op.id,
    'numero_op', v_op.numero_op,
    'produto_id', p_produto_id,
    'quantidade', p_quantidade,
    'custo_unitario', v_prod.custo_medio,
    'custo_total', round(p_quantidade * v_prod.custo_medio, 6)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_financeiro_custo_op_registrar_indireto(
  p_ordem_producao_id uuid,
  p_tipo text,
  p_valor numeric,
  p_referencia text DEFAULT NULL,
  p_horas numeric DEFAULT 0,
  p_custo_hora numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_empresa uuid := public.erp_current_empresa_id();
  v_op record;
  v_id uuid;
  v_tipo text := upper(btrim(coalesce(p_tipo, '')));
BEGIN
  IF auth.uid() IS NULL OR v_empresa IS NULL THEN
    RAISE EXCEPTION 'SESSAO_EMPRESA_NAO_IDENTIFICADA';
  END IF;
  IF NOT public.erp_has_permission('financeiro', 'lancar') THEN
    RAISE EXCEPTION 'SEM_PERMISSAO_PARA_LANCAR_CUSTO_INDIRETO';
  END IF;
  IF v_tipo NOT IN ('ENERGIA', 'INDIRETO', 'TERCEIRIZACAO', 'EMBALAGEM', 'PERDA')
     OR p_valor IS NULL OR p_valor <= 0
     OR coalesce(p_horas, 0) < 0 OR coalesce(p_custo_hora, 0) < 0 THEN
    RAISE EXCEPTION 'LANCAMENTO_DE_CUSTO_INDIRETO_INVALIDO';
  END IF;

  SELECT o.id, o.produto_id
    INTO v_op
    FROM public.erp_ordens_producao o
   WHERE o.id = p_ordem_producao_id
     AND o.empresa_id = v_empresa
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDEM_DE_PRODUCAO_NAO_ENCONTRADA_NA_EMPRESA';
  END IF;

  INSERT INTO public.erp_custos_apontamentos (
    empresa_id, ordem_producao_id, produto_id, tipo,
    horas, custo_hora, valor, referencia
  )
  VALUES (
    v_empresa, v_op.id, v_op.produto_id, v_tipo,
    coalesce(p_horas, 0), coalesce(p_custo_hora, 0), p_valor,
    nullif(btrim(p_referencia), '')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_financeiro_custo_op_apurar(
  p_ordem_producao_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_empresa uuid := public.erp_current_empresa_id();
  v_op record;
  v_material_count integer := 0;
  v_material_sem_custo integer := 0;
  v_material numeric(18,6) := 0;
  v_apontamentos integer := 0;
  v_apontamentos_abertos integer := 0;
  v_apontamentos_duracao_invalida integer := 0;
  v_labor_sem_custo integer := 0;
  v_maquina_sem_custo integer := 0;
  v_mao_obra numeric(18,6) := 0;
  v_maquinas numeric(18,6) := 0;
  v_boa numeric(18,6) := 0;
  v_refugo numeric(18,6) := 0;
  v_energia numeric(18,6) := 0;
  v_indiretos numeric(18,6) := 0;
  v_terceirizacao numeric(18,6) := 0;
  v_embalagem numeric(18,6) := 0;
  v_perdas numeric(18,6) := 0;
  v_overhead numeric(18,6) := 0;
  v_total numeric(18,6) := 0;
  v_preco numeric(18,6) := 0;
  v_receita numeric(18,6) := 0;
  v_margem numeric(18,6) := 0;
  v_margem_percentual numeric(9,4) := 0;
  v_markup numeric(9,4) := 0;
  v_custo_id uuid;
  v_revisao integer := 1;
  v_status text;
BEGIN
  IF auth.uid() IS NULL OR v_empresa IS NULL THEN
    RAISE EXCEPTION 'SESSAO_EMPRESA_NAO_IDENTIFICADA';
  END IF;
  IF NOT public.erp_has_permission('financeiro', 'lancar') THEN
    RAISE EXCEPTION 'SEM_PERMISSAO_PARA_APURAR_CUSTO_DA_OP';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_empresa::text), hashtext(p_ordem_producao_id::text));

  SELECT o.id, o.numero_op, o.produto_id, o.status
    INTO v_op
    FROM public.erp_ordens_producao o
   WHERE o.id = p_ordem_producao_id
     AND o.empresa_id = v_empresa
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDEM_DE_PRODUCAO_NAO_ENCONTRADA_NA_EMPRESA';
  END IF;
  IF lower(coalesce(v_op.status, '')) IN ('cancelada', 'cancelado') THEN
    RAISE EXCEPTION 'ORDEM_CANCELADA_NAO_PODE_SER_APURADA';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE m.custo_unitario IS NULL OR m.custo_unitario <= 0),
         coalesce(sum(m.quantidade * m.custo_unitario), 0)
    INTO v_material_count, v_material_sem_custo, v_material
    FROM public.erp_estoque_movimentos m
   WHERE m.empresa_id = v_empresa
     AND m.ordem_producao_id = p_ordem_producao_id
     AND m.tipo = 'consumo'
     AND m.origem = 'consumo_producao';
  IF v_material_count = 0 THEN
    RAISE EXCEPTION 'CONSUMO_REAL_DE_MATERIAL_NAO_REGISTRADO';
  END IF;
  IF v_material_sem_custo > 0 THEN
    RAISE EXCEPTION 'EXISTE_CONSUMO_SEM_CUSTO_UNITARIO';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE a.fim_em IS NULL),
         count(*) FILTER (WHERE a.fim_em IS NOT NULL AND a.fim_em <= a.inicio_em),
         count(*) FILTER (
           WHERE a.fim_em IS NOT NULL
             AND (a.operador_id IS NULL OR f.id IS NULL OR coalesce(f.custo_hora_homem, 0) <= 0)
         ),
         count(*) FILTER (
           WHERE a.fim_em IS NOT NULL
             AND a.maquina_id IS NOT NULL
             AND (m.id IS NULL OR coalesce(m.custo_hora, 0) <= 0)
         ),
         coalesce(sum((extract(epoch FROM (a.fim_em - a.inicio_em)) / 3600) * coalesce(f.custo_hora_homem, 0))
           FILTER (WHERE a.fim_em IS NOT NULL), 0),
         coalesce(sum((extract(epoch FROM (a.fim_em - a.inicio_em)) / 3600) * coalesce(m.custo_hora, 0))
           FILTER (WHERE a.fim_em IS NOT NULL AND a.maquina_id IS NOT NULL), 0),
         coalesce(sum(a.quantidade_boa) FILTER (WHERE a.fim_em IS NOT NULL), 0),
         coalesce(sum(a.quantidade_refugada) FILTER (WHERE a.fim_em IS NOT NULL), 0)
    INTO v_apontamentos, v_apontamentos_abertos, v_apontamentos_duracao_invalida, v_labor_sem_custo, v_maquina_sem_custo,
         v_mao_obra, v_maquinas, v_boa, v_refugo
    FROM public.erp_apontamentos_processo a
    LEFT JOIN public.erp_funcionarios f
      ON f.id = a.operador_id AND f.empresa_id = a.empresa_id
    LEFT JOIN public.erp_maquinas m
      ON m.id = a.maquina_id AND m.empresa_id = a.empresa_id
   WHERE a.empresa_id = v_empresa
     AND a.ordem_producao_id = p_ordem_producao_id;
  IF v_apontamentos = 0 THEN
    RAISE EXCEPTION 'APONTAMENTOS_REAIS_DA_OP_NAO_ENCONTRADOS';
  END IF;
  IF v_apontamentos_abertos > 0 THEN
    RAISE EXCEPTION 'EXISTE_APONTAMENTO_DE_PRODUCAO_ABERTO';
  END IF;
  IF v_apontamentos_duracao_invalida > 0 THEN
    RAISE EXCEPTION 'APONTAMENTO_COM_DURACAO_INVALIDA';
  END IF;
  IF v_labor_sem_custo > 0 THEN
    RAISE EXCEPTION 'OPERADOR_SEM_CUSTO_HORA_HOMEM_CADASTRADO';
  END IF;
  IF v_mao_obra <= 0 THEN
    RAISE EXCEPTION 'CUSTO_DE_MAO_DE_OBRA_NAO_APURADO';
  END IF;
  IF v_maquina_sem_custo > 0 THEN
    RAISE EXCEPTION 'MAQUINA_SEM_CUSTO_HORA_CADASTRADO';
  END IF;
  IF v_boa <= 0 THEN
    RAISE EXCEPTION 'QUANTIDADE_BOA_NAO_REGISTRADA_PARA_APURAR_CUSTO_UNITARIO';
  END IF;

  SELECT
    coalesce(sum(c.valor) FILTER (WHERE c.tipo = 'ENERGIA'), 0),
    coalesce(sum(c.valor) FILTER (WHERE c.tipo = 'INDIRETO'), 0),
    coalesce(sum(c.valor) FILTER (WHERE c.tipo = 'TERCEIRIZACAO'), 0),
    coalesce(sum(c.valor) FILTER (WHERE c.tipo = 'EMBALAGEM'), 0),
    coalesce(sum(c.valor) FILTER (WHERE c.tipo = 'PERDA'), 0)
    INTO v_energia, v_indiretos, v_terceirizacao, v_embalagem, v_perdas
    FROM public.erp_custos_apontamentos c
   WHERE c.empresa_id = v_empresa
     AND c.ordem_producao_id = p_ordem_producao_id;
  v_overhead := v_maquinas + v_energia + v_indiretos + v_terceirizacao + v_embalagem + v_perdas;
  IF v_overhead <= 0 THEN
    RAISE EXCEPTION 'CUSTOS_INDIRETOS_E_OVERHEAD_NAO_REGISTRADOS';
  END IF;

  SELECT coalesce(p.preco_venda, 0)
    INTO v_preco
    FROM public.erp_produtos p
   WHERE p.id = v_op.produto_id
     AND p.empresa_id = v_empresa;
  v_receita := v_preco * v_boa;
  v_total := v_material + v_mao_obra + v_overhead;
  IF v_preco > 0 THEN
    v_margem := v_receita - v_total;
    v_margem_percentual := CASE WHEN v_receita > 0 THEN (v_margem / v_receita) * 100 ELSE 0 END;
    v_markup := CASE WHEN v_total > 0 THEN (v_margem / v_total) * 100 ELSE 0 END;
    v_status := CASE WHEN lower(coalesce(v_op.status, '')) IN ('concluida', 'concluído', 'encerrada', 'finalizada') THEN 'APURADO' ELSE 'APURADO_PARCIAL' END;
  ELSE
    v_margem := 0;
    v_margem_percentual := 0;
    v_markup := 0;
    v_status := 'APURADO_SEM_PRECO';
  END IF;

  SELECT coalesce(max(c.revisao_apuracao), 0) + 1
    INTO v_revisao
    FROM public.erp_custos_produtos c
   WHERE c.empresa_id = v_empresa
     AND c.ordem_producao_id = p_ordem_producao_id
     AND c.tipo_calculo = 'REAL';

  INSERT INTO public.erp_custos_produtos (
    empresa_id, produto_id, ordem_producao_id, tipo_calculo,
    materiais, mao_obra, maquinas, energia, custos_indiretos,
    terceirizacao, embalagem, perdas_refugo, custo_fabricacao, custo_total,
    quantidade_base, preco_venda, markup_percentual, margem_valor, margem_percentual,
    receita_estimada, status_apuracao, revisao_apuracao, apurado_em, apurado_por, updated_at
  )
  VALUES (
    v_empresa, v_op.produto_id, p_ordem_producao_id, 'REAL',
    v_material, v_mao_obra, v_maquinas, v_energia, v_indiretos,
    v_terceirizacao, v_embalagem, v_perdas, v_total, v_total,
    v_boa, v_preco, v_markup, v_margem, v_margem_percentual,
    v_receita, v_status, v_revisao, now(), auth.uid(), now()
  )
  RETURNING id INTO v_custo_id;

  INSERT INTO public.erp_custos_componentes (
    empresa_id, custo_id, produto_id, quantidade, custo_unitario, perda_percentual, custo_total
  )
  SELECT
    v_empresa,
    v_custo_id,
    m.produto_id,
    sum(m.quantidade),
    sum(m.quantidade * m.custo_unitario) / nullif(sum(m.quantidade), 0),
    0,
    sum(m.quantidade * m.custo_unitario)
  FROM public.erp_estoque_movimentos m
  WHERE m.empresa_id = v_empresa
    AND m.ordem_producao_id = p_ordem_producao_id
    AND m.tipo = 'consumo'
    AND m.origem = 'consumo_producao'
  GROUP BY m.produto_id;

  RETURN jsonb_build_object(
    'id', v_custo_id,
    'ordem_producao_id', p_ordem_producao_id,
    'numero_op', v_op.numero_op,
    'status', v_status,
    'revisao', v_revisao,
    'custo_material', v_material,
    'custo_mao_obra', v_mao_obra,
    'custo_maquinas', v_maquinas,
    'custo_overhead', v_overhead,
    'custo_total', v_total,
    'quantidade_produzida', v_boa,
    'quantidade_refugada', v_refugo,
    'custo_unitario', v_total / nullif(v_boa, 0),
    'preco_venda_unitario', v_preco,
    'receita_estimada', v_receita,
    'margem_valor', v_margem,
    'margem_percentual', v_margem_percentual
  );
END;
$$;

REVOKE ALL ON FUNCTION public.erp_pcp_consumir_material_op(uuid, uuid, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_financeiro_custo_op_registrar_indireto(uuid, text, numeric, text, numeric, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_financeiro_custo_op_apurar(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.erp_pcp_consumir_material_op(uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_financeiro_custo_op_registrar_indireto(uuid, text, numeric, text, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_financeiro_custo_op_apurar(uuid) TO authenticated;
