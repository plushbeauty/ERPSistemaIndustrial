-- REV-APURACAO-CUSTOS-OP-PARA-DESVIOS-20261110-01
-- Espelha somente apurações REAL efetivamente fechadas em erp_custos_produtos.
-- Nunca cria dados de demonstração nem calcula custo real no navegador.
CREATE OR REPLACE FUNCTION public.erp_financeiro_apuracao_custos_sync_real()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
 v_op record; v_prod record; v_padrao record; v_qtd numeric(18,6);
 v_mp_padrao numeric(18,6):=0; v_mod_padrao numeric(18,6):=0; v_ggf_padrao numeric(18,6):=0;
 v_padrao_unit numeric(18,6):=0; v_ggf_real numeric(18,6):=0;
BEGIN
 IF NEW.tipo_calculo<>'REAL' OR NEW.ordem_producao_id IS NULL THEN RETURN NEW; END IF;
 SELECT o.id,o.numero_op,o.produto_id INTO v_op FROM public.erp_ordens_producao o
 WHERE o.id=NEW.ordem_producao_id AND o.empresa_id=NEW.empresa_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'OP_NAO_ENCONTRADA_PARA_SINCRONIZAR_APURACAO_REAL'; END IF;
 SELECT p.id,p.codigo,p.nome INTO v_prod FROM public.erp_produtos p
 WHERE p.id=NEW.produto_id AND p.empresa_id=NEW.empresa_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'PRODUTO_NAO_ENCONTRADO_PARA_SINCRONIZAR_APURACAO_REAL'; END IF;
 SELECT cp.custo_total,cp.custo_materiais,cp.custo_fabricacao,cp.custo_maquina INTO v_padrao
 FROM public.erp_financeiro_custo_padrao cp
 WHERE cp.empresa_id=NEW.empresa_id AND cp.produto_id=NEW.produto_id
 ORDER BY cp.created_at DESC LIMIT 1;
 v_qtd:=coalesce(NEW.quantidade_base,0);
 IF v_qtd<=0 THEN RAISE EXCEPTION 'QUANTIDADE_PRODUZIDA_INVALIDA_PARA_APURACAO'; END IF;
 IF FOUND THEN
  v_padrao_unit:=coalesce(v_padrao.custo_total,0);
  v_mp_padrao:=coalesce(v_padrao.custo_materiais,0)*v_qtd;
  v_mod_padrao:=coalesce(v_padrao.custo_fabricacao,0)*v_qtd;
  v_ggf_padrao:=coalesce(v_padrao.custo_maquina,0)*v_qtd;
 END IF;
 v_ggf_real:=coalesce(NEW.maquinas,0)+coalesce(NEW.energia,0)+coalesce(NEW.custos_indiretos,0)
  +coalesce(NEW.terceirizacao,0)+coalesce(NEW.embalagem,0)+coalesce(NEW.perdas_refugo,0);
 INSERT INTO public.erp_financeiro_apuracao_custos(
  empresa_id,competencia,data_apuracao,produto_id,codigo_produto,descricao_produto,op_id,op_numero,
  quantidade_produzida,custo_padrao_total,custo_real_total,custo_padrao_unitario,custo_real_unitario,
  mp_padrao,mp_real,mod_padrao,mod_real,ggf_padrao,ggf_real,origem,criado_por
 ) VALUES (
  NEW.empresa_id,to_char(coalesce(NEW.apurado_em,now()),'YYYY-MM'),coalesce(NEW.apurado_em,now()),
  NEW.produto_id,v_prod.codigo,v_prod.nome,NEW.ordem_producao_id,v_op.numero_op,v_qtd,
  v_padrao_unit*v_qtd,coalesce(NEW.custo_total,0),v_padrao_unit,
  coalesce(NEW.custo_total,0)/nullif(v_qtd,0),v_mp_padrao,coalesce(NEW.materiais,0),
  v_mod_padrao,coalesce(NEW.mao_obra,0),v_ggf_padrao,v_ggf_real,
  CASE WHEN v_padrao_unit>0 THEN 'APURACAO_PRODUCAO' ELSE 'APURACAO_PRODUCAO_SEM_CUSTO_PADRAO' END,
  NEW.apurado_por
 );
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_erp_fin_apuracao_custos_sync_real ON public.erp_custos_produtos;
CREATE TRIGGER trg_erp_fin_apuracao_custos_sync_real
AFTER INSERT OR UPDATE OF tipo_calculo,ordem_producao_id,materiais,mao_obra,maquinas,energia,custos_indiretos,
 terceirizacao,embalagem,perdas_refugo,custo_total,quantidade_base,apurado_em,apurado_por
ON public.erp_custos_produtos FOR EACH ROW
WHEN (NEW.tipo_calculo='REAL' AND NEW.ordem_producao_id IS NOT NULL)
EXECUTE FUNCTION public.erp_financeiro_apuracao_custos_sync_real();
REVOKE ALL ON FUNCTION public.erp_financeiro_apuracao_custos_sync_real() FROM PUBLIC,anon,authenticated;
