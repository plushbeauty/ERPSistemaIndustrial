-- REV-ESTOQUE-CONFERENCIA-INVENTARIO-20261110-01
-- Valida defeitos, OP e estado do inventário no banco, dentro da transação.
CREATE OR REPLACE FUNCTION public.erp_registrar_conferencia_producao(
 p_ordem_producao_id uuid,p_quantidade_encontrada numeric,p_quantidade_defeituosa numeric,
 p_defeitos jsonb DEFAULT '[]'::jsonb,p_localizacao_destino_id uuid DEFAULT NULL::uuid,
 p_acabamento boolean DEFAULT false,p_observacao text DEFAULT NULL::text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
 v_empresa uuid:=public.erp_current_empresa_id(); v_op record; v_conf uuid; v_boa numeric;
 v_defeito jsonb; v_defeitos_total numeric:=0; v_defeitos_invalidos integer:=0; v_ja_conferida numeric:=0;
BEGIN
 IF auth.uid() IS NULL OR v_empresa IS NULL THEN RAISE EXCEPTION 'Empresa da sessão não identificada'; END IF;
 IF NOT (public.erp_is_master() OR public.erp_has_permission('estoque','editar')) THEN RAISE EXCEPTION 'Sem permissão para registrar conferência de produção.'; END IF;
 IF p_ordem_producao_id IS NULL OR p_quantidade_encontrada IS NULL OR p_quantidade_defeituosa IS NULL
 OR p_quantidade_encontrada<0 OR p_quantidade_defeituosa<0 OR p_quantidade_defeituosa>p_quantidade_encontrada
 OR p_quantidade_encontrada::text IN ('NaN','Infinity','-Infinity')
 OR p_quantidade_defeituosa::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidades de conferência inválidas'; END IF;
 IF jsonb_typeof(coalesce(p_defeitos,'[]'::jsonb))<>'array' THEN RAISE EXCEPTION 'A lista de defeitos deve ser uma lista válida.'; END IF;
 SELECT * INTO v_op FROM public.erp_ordens_producao WHERE id=p_ordem_producao_id AND empresa_id=v_empresa FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ordem de produção não encontrada para a empresa atual'; END IF;
 IF lower(coalesce(v_op.status,'')) IN ('cancelada','cancelado','concluida','concluído','encerrada','finalizada') THEN RAISE EXCEPTION 'A ordem de produção já está encerrada ou cancelada.'; END IF;
 IF p_localizacao_destino_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.erp_estoque_localizacoes l WHERE l.id=p_localizacao_destino_id AND l.empresa_id=v_empresa AND l.ativo=true
 ) THEN RAISE EXCEPTION 'Endereço de destino não pertence à empresa ou está inativo.'; END IF;
 SELECT coalesce(sum(CASE WHEN (d.value->>'quantidade') ~ '^[0-9]+([.][0-9]+)?$' THEN (d.value->>'quantidade')::numeric ELSE 0 END),0),
 count(*) FILTER(WHERE coalesce(trim(d.value->>'defeito'),'')='' OR (d.value->>'quantidade') !~ '^[0-9]+([.][0-9]+)?$'
 OR CASE WHEN (d.value->>'quantidade') ~ '^[0-9]+([.][0-9]+)?$' THEN (d.value->>'quantidade')::numeric<=0 ELSE true END)
 INTO v_defeitos_total,v_defeitos_invalidos FROM jsonb_array_elements(coalesce(p_defeitos,'[]'::jsonb)) d(value);
 IF v_defeitos_invalidos>0 THEN RAISE EXCEPTION 'Existe defeito sem descrição ou com quantidade inválida.'; END IF;
 IF p_quantidade_defeituosa>0 AND (jsonb_array_length(coalesce(p_defeitos,'[]'::jsonb))=0 OR abs(v_defeitos_total-p_quantidade_defeituosa)>0.000001)
 THEN RAISE EXCEPTION 'A soma dos defeitos detalhados deve ser igual à quantidade defeituosa.'; END IF;
 SELECT coalesce(sum(quantidade_encontrada),0) INTO v_ja_conferida FROM public.erp_producao_conferencias
 WHERE empresa_id=v_empresa AND ordem_producao_id=v_op.id AND status='conferida';
 IF v_ja_conferida+p_quantidade_encontrada>coalesce(v_op.quantidade,0) THEN
  RAISE EXCEPTION 'A conferência excede a quantidade planejada da OP. Já conferido: %, planejado: %.',v_ja_conferida,v_op.quantidade;
 END IF;
 v_boa:=p_quantidade_encontrada-p_quantidade_defeituosa;
 INSERT INTO public.erp_producao_conferencias(empresa_id,ordem_producao_id,produto_id,quantidade_planejada,quantidade_encontrada,quantidade_defeituosa,quantidade_lancada_estoque,quantidade_lancada_refugo,status,acabamento,observacao,conferido_por)
 VALUES(v_empresa,v_op.id,v_op.produto_id,v_op.quantidade,p_quantidade_encontrada,p_quantidade_defeituosa,v_boa,p_quantidade_defeituosa,'conferida',p_acabamento,p_observacao,(SELECT id FROM public.erp_usuarios WHERE auth_user_id=auth.uid() LIMIT 1))
 RETURNING id INTO v_conf;
 FOR v_defeito IN SELECT value FROM jsonb_array_elements(coalesce(p_defeitos,'[]'::jsonb)) LOOP
  INSERT INTO public.erp_producao_defeitos(empresa_id,conferencia_id,ordem_producao_id,produto_id,defeito,quantidade,observacao,encaminhado_qualidade)
  VALUES(v_empresa,v_conf,v_op.id,v_op.produto_id,trim(v_defeito->>'defeito'),(v_defeito->>'quantidade')::numeric,nullif(trim(v_defeito->>'observacao'),''),true);
 END LOOP;
 IF v_boa>0 THEN
  INSERT INTO public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,origem,documento,ordem_producao_id,localizacao_destino_id,observacao)
  VALUES(v_empresa,v_op.produto_id,'entrada',v_boa,'producao',v_op.numero_op,v_op.id,p_localizacao_destino_id,'Conferência de produção: quantidade boa');
  UPDATE public.erp_produtos SET estoque_atual=coalesce(estoque_atual,0)+v_boa WHERE id=v_op.produto_id AND empresa_id=v_empresa;
 END IF;
 IF p_quantidade_defeituosa>0 THEN
  INSERT INTO public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,origem,documento,ordem_producao_id,observacao)
  VALUES(v_empresa,v_op.produto_id,'refugo',p_quantidade_defeituosa,'producao',v_op.numero_op,v_op.id,'Conferência de produção: refugo encaminhado à qualidade');
 END IF;
 UPDATE public.erp_ordens_producao SET status=CASE WHEN v_ja_conferida+p_quantidade_encontrada>=v_op.quantidade THEN 'concluida' ELSE 'parcial' END
 WHERE id=v_op.id AND empresa_id=v_empresa;
 RETURN jsonb_build_object('conferencia_id',v_conf,'ordem_producao_id',v_op.id,'numero_op',v_op.numero_op,'quantidade_planejada',v_op.quantidade,
 'quantidade_encontrada',p_quantidade_encontrada,'quantidade_ja_conferida',v_ja_conferida,'quantidade_defeituosa',p_quantidade_defeituosa,
 'quantidade_boa',v_boa,'saldo_producao',greatest(v_op.quantidade-v_ja_conferida-p_quantidade_encontrada,0));
END; $$;

CREATE OR REPLACE FUNCTION public.erp_estoque_inventario_ajustar(p_inventario_id uuid,p_produto_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_empresa uuid:=public.erp_current_empresa_id(); v_diff numeric;
BEGIN
 IF auth.uid() IS NULL OR v_empresa IS NULL THEN RAISE EXCEPTION 'Empresa da sessão não identificada.'; END IF;
 IF NOT (public.erp_is_master() OR public.erp_has_permission('estoque','editar')) THEN RAISE EXCEPTION 'Sem permissão para ajustar estoque.'; END IF;
 SELECT i.quantidade_contada-(i.quantidade_sistema_congelada-i.quantidade_venda_concorrente) INTO v_diff
 FROM public.erp_estoque_inventario_itens i JOIN public.erp_estoque_inventarios inv ON inv.id=i.inventario_id AND inv.empresa_id=i.empresa_id
 WHERE i.inventario_id=p_inventario_id AND i.produto_id=p_produto_id AND i.empresa_id=v_empresa
 AND i.quantidade_contada IS NOT NULL AND i.ajustado=false AND inv.status='aberto' FOR UPDATE OF i,inv;
 IF v_diff IS NULL THEN RAISE EXCEPTION 'Inventário não está aberto ou a contagem ainda não foi registrada.'; END IF;
 IF v_diff<>0 THEN
  INSERT INTO public.erp_estoque_movimentos(empresa_id,produto_id,tipo,quantidade,origem,documento,observacao)
  VALUES(v_empresa,p_produto_id,CASE WHEN v_diff>0 THEN 'entrada' ELSE 'saida' END,abs(v_diff),'Inventário','INV-'||p_inventario_id::text,'Ajuste de inventário cíclico — saldo congelado menos vendas concorrentes');
 END IF;
 UPDATE public.erp_estoque_inventario_itens SET divergencia=v_diff,ajustado=true
 WHERE inventario_id=p_inventario_id AND produto_id=p_produto_id AND empresa_id=v_empresa AND ajustado=false;
 RETURN v_diff;
END; $$;
REVOKE ALL ON FUNCTION public.erp_registrar_conferencia_producao(uuid,numeric,numeric,jsonb,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.erp_registrar_conferencia_producao(uuid,numeric,numeric,jsonb,uuid,boolean,text) TO authenticated;
REVOKE ALL ON FUNCTION public.erp_estoque_inventario_ajustar(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.erp_estoque_inventario_ajustar(uuid,uuid) TO authenticated;
