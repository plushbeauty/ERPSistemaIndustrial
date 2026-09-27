CREATE UNIQUE INDEX IF NOT EXISTS ux_erp_op_empresa_numero ON public.erp_ordens_producao (empresa_id, numero_op);

CREATE OR REPLACE FUNCTION public.erp_criar_ordem_producao_v2(
  p_produto_id uuid,
  p_quantidade numeric,
  p_pedido_venda_id uuid DEFAULT NULL,
  p_maquina_id uuid DEFAULT NULL,
  p_velocidade_nominal_hora numeric DEFAULT NULL,
  p_operacao_dupla boolean DEFAULT false
) RETURNS TABLE(id uuid, numero_op bigint, ficha_id uuid, maquina_id uuid, ciclo_seg numeric, cavidades integer, tempo_estimado_horas numeric)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_empresa_id uuid;
  v_ficha public.erp_fichas_processo%ROWTYPE;
  v_maquina uuid;
  v_rate numeric;
  v_tempo numeric;
  v_numero bigint;
BEGIN
  v_empresa_id := public.erp_current_empresa_id();
  IF v_empresa_id IS NULL THEN RAISE EXCEPTION 'Empresa da sessão não identificada.'; END IF;
  IF p_produto_id IS NULL OR p_quantidade IS NULL OR p_quantidade <= 0 THEN RAISE EXCEPTION 'Produto e quantidade válida são obrigatórios.'; END IF;
  SELECT * INTO v_ficha FROM public.erp_fichas_processo f
   WHERE f.empresa_id = v_empresa_id AND f.produto_id = p_produto_id
     AND f.status IN ('APROVADA','LIBERADA')
   ORDER BY f.revisao DESC, f.atualizado_em DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto sem ficha de processo aprovada/liberada.'; END IF;
  v_maquina := coalesce(p_maquina_id, v_ficha.maquina_id);
  IF v_maquina IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.erp_maquinas m
    WHERE m.id=v_maquina AND m.empresa_id=v_empresa_id AND m.ativo=true AND m.status <> 'INATIVA'
  ) THEN RAISE EXCEPTION 'Máquina não pertence à empresa ou está inativa.'; END IF;
  v_rate := p_velocidade_nominal_hora;
  IF v_rate IS NULL OR v_rate <= 0 THEN
    IF v_ficha.ciclo_seg IS NULL OR v_ficha.ciclo_seg <= 0 OR v_ficha.cavidades_ativas <= 0 THEN
      RAISE EXCEPTION 'Velocidade não informada e ficha sem ciclo/cavidades válidos.';
    END IF;
    v_rate := (3600 / v_ficha.ciclo_seg) * v_ficha.cavidades_ativas;
  END IF;
  IF p_operacao_dupla THEN v_rate := v_rate * 2; END IF;
  v_tempo := p_quantidade / v_rate;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_empresa_id::text, 0));
  SELECT coalesce(max(o.numero_op),0)+1 INTO v_numero FROM public.erp_ordens_producao o WHERE o.empresa_id=v_empresa_id;
  INSERT INTO public.erp_ordens_producao (
    empresa_id,numero_op,produto_id,ficha_id,pedido_venda_id,quantidade,quantidade_planejada,
    quantidade_produzida,status,maquina_id,velocidade_nominal_hora,operacao_dupla,tempo_estimado_horas
  ) VALUES (
    v_empresa_id,v_numero,p_produto_id,v_ficha.id,p_pedido_venda_id,p_quantidade,p_quantidade,
    0,'pendente',v_maquina,v_rate,p_operacao_dupla,v_tempo
  ) RETURNING erp_ordens_producao.id INTO id;
  numero_op:=v_numero; ficha_id:=v_ficha.id; maquina_id:=v_maquina; ciclo_seg:=v_ficha.ciclo_seg; cavidades:=v_ficha.cavidades_ativas; tempo_estimado_horas:=v_tempo;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_criar_ordem_producao_v2(uuid,numeric,uuid,uuid,numeric,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_criar_ordem_producao_v2(uuid,numeric,uuid,uuid,numeric,boolean) TO authenticated;
