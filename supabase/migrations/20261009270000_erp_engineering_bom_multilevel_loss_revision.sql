-- Engineering BOM v2: multi-level composition, revision control and process loss.
ALTER TABLE public.erp_pcp_bom_itens
  ADD COLUMN IF NOT EXISTS item_pai_id uuid,
  ADD COLUMN IF NOT EXISTS perda_galvanica_percent numeric(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS perda_mecanica_percent numeric(7,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revisao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS vigencia_inicio date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS vigencia_fim date,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='erp_pcp_bom_item_pai_fk' AND conrelid='public.erp_pcp_bom_itens'::regclass) THEN
    ALTER TABLE public.erp_pcp_bom_itens ADD CONSTRAINT erp_pcp_bom_item_pai_fk
      FOREIGN KEY (item_pai_id) REFERENCES public.erp_pcp_bom_itens(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='erp_pcp_bom_perda_galvanica_ck' AND conrelid='public.erp_pcp_bom_itens'::regclass) THEN
    ALTER TABLE public.erp_pcp_bom_itens ADD CONSTRAINT erp_pcp_bom_perda_galvanica_ck CHECK (perda_galvanica_percent >= 0 AND perda_galvanica_percent < 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='erp_pcp_bom_perda_mecanica_ck' AND conrelid='public.erp_pcp_bom_itens'::regclass) THEN
    ALTER TABLE public.erp_pcp_bom_itens ADD CONSTRAINT erp_pcp_bom_perda_mecanica_ck CHECK (perda_mecanica_percent >= 0 AND perda_mecanica_percent < 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='erp_pcp_bom_vigencia_ck' AND conrelid='public.erp_pcp_bom_itens'::regclass) THEN
    ALTER TABLE public.erp_pcp_bom_itens ADD CONSTRAINT erp_pcp_bom_vigencia_ck CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_erp_pcp_bom_tenant_parent_revision
  ON public.erp_pcp_bom_itens (empresa_id, produto_pai_id, revisao, ativo);
CREATE INDEX IF NOT EXISTS idx_erp_pcp_bom_parent_item ON public.erp_pcp_bom_itens (item_pai_id);

CREATE OR REPLACE FUNCTION public.erp_pcp_bom_adicionar_detalhado(
  p_produto_pai_id uuid, p_produto_id uuid, p_sku_insumo text, p_qtd numeric,
  p_unidade text, p_custo_unitario numeric, p_item_pai_id uuid DEFAULT NULL,
  p_perda_galvanica_percent numeric DEFAULT 0, p_perda_mecanica_percent numeric DEFAULT 0,
  p_revisao integer DEFAULT 1, p_vigencia_inicio date DEFAULT current_date, p_vigencia_fim date DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE v_empresa uuid := public.erp_current_empresa_id(); v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Empresa da sessão não identificada.'; END IF;
  IF p_produto_pai_id IS NULL OR p_produto_id IS NULL OR nullif(btrim(p_sku_insumo),'') IS NULL
    OR p_qtd IS NULL OR p_qtd <= 0 OR nullif(btrim(p_unidade),'') IS NULL
    OR p_custo_unitario IS NULL OR p_custo_unitario < 0 THEN
    RAISE EXCEPTION 'Produto, componente, quantidade, unidade e custo devem ser válidos.';
  END IF;
  IF coalesce(p_perda_galvanica_percent,0) < 0 OR p_perda_galvanica_percent >= 100
    OR coalesce(p_perda_mecanica_percent,0) < 0 OR p_perda_mecanica_percent >= 100 THEN
    RAISE EXCEPTION 'As perdas galvânica e mecânica devem estar entre 0 e 100%.';
  END IF;
  IF coalesce(p_revisao,0) < 1 OR p_vigencia_inicio IS NULL
    OR (p_vigencia_fim IS NOT NULL AND p_vigencia_fim < p_vigencia_inicio) THEN
    RAISE EXCEPTION 'Revisão ou vigência inválida.';
  END IF;
  IF p_produto_pai_id = p_produto_id THEN RAISE EXCEPTION 'Produto não pode ser componente de si mesmo.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.erp_produtos WHERE id=p_produto_pai_id AND empresa_id=v_empresa AND ativo=true)
    OR NOT EXISTS (SELECT 1 FROM public.erp_produtos WHERE id=p_produto_id AND empresa_id=v_empresa AND ativo=true) THEN
    RAISE EXCEPTION 'Produto pai e componente devem estar ativos na empresa atual.';
  END IF;
  IF p_item_pai_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.erp_pcp_bom_itens WHERE id=p_item_pai_id AND empresa_id=v_empresa
      AND produto_pai_id=p_produto_pai_id AND ativo=true
  ) THEN RAISE EXCEPTION 'Item superior inválido para esta estrutura/empresa.'; END IF;

  INSERT INTO public.erp_pcp_bom_itens (
    empresa_id,produto_pai_id,produto_id,sku_insumo,qtd,unidade,custo_unitario,
    item_pai_id,perda_galvanica_percent,perda_mecanica_percent,revisao,vigencia_inicio,vigencia_fim,ativo
  ) VALUES (
    v_empresa,p_produto_pai_id,p_produto_id,btrim(p_sku_insumo),p_qtd,btrim(p_unidade),p_custo_unitario,
    p_item_pai_id,coalesce(p_perda_galvanica_percent,0),coalesce(p_perda_mecanica_percent,0),p_revisao,p_vigencia_inicio,p_vigencia_fim,true
  ) RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.erp_pcp_bom_adicionar_detalhado(uuid,uuid,text,numeric,text,numeric,uuid,numeric,numeric,integer,date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.erp_pcp_bom_adicionar_detalhado(uuid,uuid,text,numeric,text,numeric,uuid,numeric,numeric,integer,date,date) TO authenticated;
