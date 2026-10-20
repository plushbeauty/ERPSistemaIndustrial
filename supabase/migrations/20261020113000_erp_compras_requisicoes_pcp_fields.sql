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


-- Criação atômica da requisição + item: evita cabeçalho órfão se a linha falhar.
CREATE OR REPLACE FUNCTION public.erp_compras_criar_requisicao_pcp(
  p_produto_id uuid,
  p_quantidade numeric,
  p_unidade_comercial text,
  p_ordem_producao_id uuid DEFAULT NULL,
  p_data_limite date DEFAULT NULL,
  p_fornecedor_id uuid DEFAULT NULL,
  p_lote_destino_op text DEFAULT NULL,
  p_maquina_recurso_id uuid DEFAULT NULL,
  p_centro_custo text DEFAULT 'PRODUCAO',
  p_urgencia_prioridade text DEFAULT 'MEDIA',
  p_justificativa_uso text DEFAULT NULL,
  p_comprador_nome text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_empresa uuid := public.erp_current_empresa_id();
  v_requisicao_id uuid;
  v_item_id uuid;
  v_codigo text;
BEGIN
  IF auth.uid() IS NULL OR v_empresa IS NULL THEN
    RAISE EXCEPTION 'Sessão ou empresa não identificada.';
  END IF;
  IF NOT (public.erp_is_master() OR public.erp_has_permission('compras','criar')) THEN
    RAISE EXCEPTION 'Sem permissão para criar requisições de compra.';
  END IF;
  IF p_produto_id IS NULL OR p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'Informe material e quantidade maior que zero.';
  END IF;
  IF p_unidade_comercial IS NULL OR length(btrim(p_unidade_comercial)) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Unidade comercial inválida.';
  END IF;
  IF p_centro_custo NOT IN ('PRODUCAO','MANUTENCAO','ADMINISTRATIVO','QUALIDADE')
     OR p_urgencia_prioridade NOT IN ('BAIXA','MEDIA','ALTA','CRITICA') THEN
    RAISE EXCEPTION 'Centro de custo ou prioridade inválidos.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.erp_produtos p WHERE p.id=p_produto_id AND p.empresa_id=v_empresa AND p.ativo=true) THEN
    RAISE EXCEPTION 'Material inexistente, inativo ou de outra empresa.';
  END IF;
  IF p_ordem_producao_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.erp_ordens_producao o WHERE o.id=p_ordem_producao_id AND o.empresa_id=v_empresa
  ) THEN RAISE EXCEPTION 'Ordem de produção não pertence à empresa atual.'; END IF;
  IF p_fornecedor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.erp_fornecedores f WHERE f.id=p_fornecedor_id AND f.empresa_id=v_empresa AND f.ativo=true
  ) THEN RAISE EXCEPTION 'Fornecedor inexistente, inativo ou de outra empresa.'; END IF;
  IF p_maquina_recurso_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.erp_maquinas m WHERE m.id=p_maquina_recurso_id AND m.empresa_id=v_empresa
  ) THEN RAISE EXCEPTION 'Máquina/recurso não pertence à empresa atual.'; END IF;

  v_codigo := 'REQ-' || to_char(clock_timestamp(),'YYMMDDHH24MISS') || '-' || upper(substr(gen_random_uuid()::text,1,4));
  INSERT INTO public.erp_requisicoes_compra
    (empresa_id,codigo,ordem_producao_id,data_limite,comprador_nome,status,
     lote_destino_op,maquina_recurso_id,centro_custo,urgencia_prioridade,justificativa_uso)
  VALUES
    (v_empresa,v_codigo,p_ordem_producao_id,p_data_limite,nullif(btrim(p_comprador_nome),''),'AGUARDANDO_COTACAO',
     nullif(btrim(p_lote_destino_op),''),p_maquina_recurso_id,p_centro_custo,p_urgencia_prioridade,nullif(btrim(p_justificativa_uso),''))
  RETURNING id INTO v_requisicao_id;

  INSERT INTO public.erp_requisicoes_compra_itens
    (empresa_id,requisicao_id,produto_id,quantidade,fornecedor_id,status,unidade_comercial)
  VALUES
    (v_empresa,v_requisicao_id,p_produto_id,p_quantidade,p_fornecedor_id,'AGUARDANDO_COTACAO',upper(btrim(p_unidade_comercial)))
  RETURNING id INTO v_item_id;

  RETURN jsonb_build_object('id',v_requisicao_id,'codigo',v_codigo,'item_id',v_item_id,'status','AGUARDANDO_COTACAO');
END;
$function$;

REVOKE ALL ON FUNCTION public.erp_compras_criar_requisicao_pcp(uuid,numeric,text,uuid,date,uuid,text,uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.erp_compras_criar_requisicao_pcp(uuid,numeric,text,uuid,date,uuid,text,uuid,text,text,text,text) TO authenticated;
