-- Security, tenant isolation hardening and industrial costing.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname,tablename,policyname,cmd,qual,with_check
    FROM pg_policies
    WHERE schemaname='public' AND tablename LIKE 'erp_%' AND 'public'=ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
    EXECUTE format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR %s TO authenticated%s%s',p.policyname,p.schemaname,p.tablename,p.cmd,CASE WHEN p.qual IS NULL THEN '' ELSE ' USING ('||p.qual||')' END,CASE WHEN p.with_check IS NULL THEN '' ELSE ' WITH CHECK ('||p.with_check||')' END);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.erp_current_empresa_id() FROM anon;
REVOKE ALL ON FUNCTION public.erp_is_master() FROM anon;
REVOKE ALL ON FUNCTION public.erp_has_permission(text,text) FROM anon;
REVOKE ALL ON FUNCTION public.erp_importar_produtos(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.erp_master_dashboard() FROM anon;
REVOKE ALL ON FUNCTION public.erp_master_aplicar_bloqueios() FROM anon;
REVOKE ALL ON FUNCTION public.erp_master_delete_usuario(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.erp_master_set_empresa_status(uuid,boolean,text) FROM anon;
REVOKE ALL ON FUNCTION public.erp_master_usuarios() FROM anon;
REVOKE ALL ON FUNCTION public.erp_next_code(text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.erp_next_document_code(text) FROM anon;
REVOKE ALL ON FUNCTION public.erp_pcp_empresa_id() FROM anon;
REVOKE ALL ON FUNCTION public.erp_preencher_empresa_pcp() FROM anon;
REVOKE ALL ON FUNCTION public.erp_resolver_login(text,text) FROM anon;
REVOKE ALL ON FUNCTION public.erp_resolver_usuario_login(text) FROM anon;
REVOKE ALL ON FUNCTION public.erp_on_auth_user_created() FROM anon;
REVOKE ALL ON FUNCTION public.obter_preco_produto(uuid,uuid,uuid,numeric) FROM anon;
REVOKE ALL ON FUNCTION public.registrar_movimentacao_estoque(uuid,text,numeric,text,text,uuid,uuid,text,uuid) FROM anon;
REVOKE ALL ON FUNCTION public.registrar_movimento_caixa(text,numeric,text) FROM anon;
REVOKE ALL ON FUNCTION public.verificar_credito_cliente(uuid,uuid,numeric) FROM anon;
REVOKE ALL ON FUNCTION public.verificar_permissao_acao(text,text) FROM anon;
REVOKE ALL ON FUNCTION public.usuario_e_admin() FROM anon;
REVOKE ALL ON FUNCTION public.usuario_empresa() FROM anon;
REVOKE ALL ON FUNCTION public.usuario_tem_permissao(character varying,character varying) FROM anon;
REVOKE ALL ON FUNCTION public.is_master_user() FROM anon;
REVOKE ALL ON FUNCTION public.current_empresa_id() FROM anon;
REVOKE ALL ON FUNCTION public.minha_empresa() FROM anon;
REVOKE ALL ON FUNCTION public.minha_empresa_id() FROM anon;
REVOKE ALL ON FUNCTION public.obter_perfil_autenticado() FROM anon;
REVOKE ALL ON FUNCTION public.abrir_caixa(numeric) FROM anon;
REVOKE ALL ON FUNCTION public.abrir_comanda(uuid,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.adicionar_item_comanda(uuid,text,uuid,numeric,uuid,uuid) FROM anon;
REVOKE ALL ON FUNCTION public.aplicar_desconto_comanda(uuid,numeric) FROM anon;
REVOKE ALL ON FUNCTION public.atualizar_comanda_contexto(uuid,uuid,uuid) FROM anon;
REVOKE ALL ON FUNCTION public.cancelar_comanda(uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.fechar_caixa(uuid,numeric,text) FROM anon;
REVOKE ALL ON FUNCTION public.fechar_comanda(uuid,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.finalizar_venda(uuid,uuid,jsonb,numeric,text,integer,numeric,numeric) FROM anon;
REVOKE ALL ON FUNCTION public.finalizar_venda(uuid,uuid,uuid,text,integer,numeric,numeric,numeric,text,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.gerar_alertas_bi(uuid) FROM anon;

CREATE TABLE IF NOT EXISTS public.erp_custos_produtos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.erp_empresas(id), produto_id uuid NOT NULL,
 ficha_id uuid, ordem_producao_id uuid, pedido_venda_id uuid, periodo_inicio date, periodo_fim date,
 tipo_calculo text NOT NULL CHECK(tipo_calculo IN('PLANEJADO','REAL','MEDIO','ULTIMO','FABRICACAO')),
 materiais numeric(18,6) NOT NULL DEFAULT 0, mao_obra numeric(18,6) NOT NULL DEFAULT 0, maquinas numeric(18,6) NOT NULL DEFAULT 0,
 energia numeric(18,6) NOT NULL DEFAULT 0, custos_indiretos numeric(18,6) NOT NULL DEFAULT 0, terceirizacao numeric(18,6) NOT NULL DEFAULT 0,
 embalagem numeric(18,6) NOT NULL DEFAULT 0, perdas_refugo numeric(18,6) NOT NULL DEFAULT 0, custo_fabricacao numeric(18,6) NOT NULL DEFAULT 0,
 custo_total numeric(18,6) NOT NULL DEFAULT 0, quantidade_base numeric(18,6) NOT NULL DEFAULT 1, preco_venda numeric(18,6) NOT NULL DEFAULT 0,
 markup_percentual numeric(9,4) NOT NULL DEFAULT 0, margem_valor numeric(18,6) NOT NULL DEFAULT 0, margem_percentual numeric(9,4) NOT NULL DEFAULT 0,
 observacoes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.erp_custos_componentes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.erp_empresas(id), custo_id uuid NOT NULL REFERENCES public.erp_custos_produtos(id),
 produto_id uuid NOT NULL, quantidade numeric(18,6) NOT NULL, custo_unitario numeric(18,6) NOT NULL DEFAULT 0,
 perda_percentual numeric(9,4) NOT NULL DEFAULT 0, custo_total numeric(18,6) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.erp_custos_apontamentos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.erp_empresas(id), ordem_producao_id uuid, produto_id uuid NOT NULL,
 funcionario_id uuid, maquina_id uuid, tipo text NOT NULL CHECK(tipo IN('MAO_OBRA','MAQUINA','ENERGIA','INDIRETO','TERCEIRIZACAO','EMBALAGEM','PERDA')),
 horas numeric(18,6) NOT NULL DEFAULT 0, quantidade numeric(18,6) NOT NULL DEFAULT 0, custo_hora numeric(18,6) NOT NULL DEFAULT 0,
 valor numeric(18,6) NOT NULL DEFAULT 0, referencia text, ocorrido_em timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.erp_produtos ADD COLUMN IF NOT EXISTS custo_ultimo numeric(18,6) NOT NULL DEFAULT 0;
ALTER TABLE public.erp_produtos ADD COLUMN IF NOT EXISTS custo_fabricacao numeric(18,6) NOT NULL DEFAULT 0;
ALTER TABLE public.erp_produtos ADD COLUMN IF NOT EXISTS markup_percentual numeric(9,4) NOT NULL DEFAULT 0;
ALTER TABLE public.erp_produtos ADD COLUMN IF NOT EXISTS margem_valor numeric(18,6) NOT NULL DEFAULT 0;
ALTER TABLE public.erp_produtos ADD COLUMN IF NOT EXISTS margem_percentual numeric(9,4) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_custos_produtos_empresa_id ON public.erp_custos_produtos(empresa_id,id);
CREATE INDEX IF NOT EXISTS idx_erp_custos_produtos_empresa_produto ON public.erp_custos_produtos(empresa_id,produto_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_custos_apontamentos_empresa_op ON public.erp_custos_apontamentos(empresa_id,ordem_producao_id);
CREATE INDEX IF NOT EXISTS idx_erp_custos_componentes_empresa_custo ON public.erp_custos_componentes(empresa_id,custo_id);
ALTER TABLE public.erp_custos_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_custos_componentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_custos_apontamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY erp_custos_produtos_tenant ON public.erp_custos_produtos FOR ALL TO authenticated USING(empresa_id=public.erp_current_empresa_id()) WITH CHECK(empresa_id=public.erp_current_empresa_id());
CREATE POLICY erp_custos_componentes_tenant ON public.erp_custos_componentes FOR ALL TO authenticated USING(empresa_id=public.erp_current_empresa_id()) WITH CHECK(empresa_id=public.erp_current_empresa_id());
CREATE POLICY erp_custos_apontamentos_tenant ON public.erp_custos_apontamentos FOR ALL TO authenticated USING(empresa_id=public.erp_current_empresa_id()) WITH CHECK(empresa_id=public.erp_current_empresa_id());
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_produtos_empresa_id ON public.erp_produtos(empresa_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_fichas_empresa_id ON public.erp_fichas_tecnicas(empresa_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_orcamentos_empresa_id ON public.erp_orcamentos(empresa_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_pedidos_venda_empresa_id ON public.erp_pedidos_venda(empresa_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_ordens_producao_empresa_id ON public.erp_ordens_producao(empresa_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_erp_vendas_empresa_id ON public.erp_vendas(empresa_id,id);

DO $$ BEGIN ALTER TABLE public.erp_custos_produtos ADD CONSTRAINT fk_erp_custos_produtos_produto_tenant FOREIGN KEY(empresa_id,produto_id) REFERENCES public.erp_produtos(empresa_id,id) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.erp_custos_componentes ADD CONSTRAINT fk_erp_custos_componentes_produto_tenant FOREIGN KEY(empresa_id,produto_id) REFERENCES public.erp_produtos(empresa_id,id) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.erp_custos_componentes ADD CONSTRAINT fk_erp_custos_componentes_custo_tenant FOREIGN KEY(empresa_id,custo_id) REFERENCES public.erp_custos_produtos(empresa_id,id) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.erp_orcamento_itens ADD CONSTRAINT fk_erp_orcamento_itens_orcamento_tenant FOREIGN KEY(empresa_id,orcamento_id) REFERENCES public.erp_orcamentos(empresa_id,id) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.erp_orcamento_itens ADD CONSTRAINT fk_erp_orcamento_itens_produto_tenant FOREIGN KEY(empresa_id,produto_id) REFERENCES public.erp_produtos(empresa_id,id) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.erp_pedido_itens ADD CONSTRAINT fk_erp_pedido_itens_pedido_tenant FOREIGN KEY(empresa_id,pedido_id) REFERENCES public.erp_pedidos_venda(empresa_id,id) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.erp_pedido_itens ADD CONSTRAINT fk_erp_pedido_itens_produto_tenant FOREIGN KEY(empresa_id,produto_id) REFERENCES public.erp_produtos(empresa_id,id) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.erp_calcular_custo_produto(p_produto_id uuid,p_quantidade numeric DEFAULT 1,p_horas_mao_obra numeric DEFAULT 0,p_custo_hora_mao_obra numeric DEFAULT 0,p_horas_maquina numeric DEFAULT 0,p_custo_hora_maquina numeric DEFAULT 0,p_energia numeric DEFAULT 0,p_custos_indiretos numeric DEFAULT 0,p_terceirizacao numeric DEFAULT 0,p_embalagem numeric DEFAULT 0,p_perda_refugo numeric DEFAULT 0,p_markup_percentual numeric DEFAULT 0)
RETURNS public.erp_custos_produtos LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_empresa uuid:=public.erp_current_empresa_id(); v_ficha uuid; v_materiais numeric:=0; v_custo numeric:=0; v_preco numeric:=0; v_margem numeric:=0; v_result public.erp_custos_produtos;
BEGIN
 IF v_empresa IS NULL OR p_produto_id IS NULL OR p_quantidade<=0 THEN RAISE EXCEPTION 'Parâmetros de custo inválidos'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.erp_produtos WHERE id=p_produto_id AND empresa_id=v_empresa) THEN RAISE EXCEPTION 'Produto não pertence à empresa atual'; END IF;
 SELECT id INTO v_ficha FROM public.erp_fichas_tecnicas WHERE empresa_id=v_empresa AND produto_id=p_produto_id AND ativa=true ORDER BY versao DESC LIMIT 1;
 IF v_ficha IS NOT NULL THEN SELECT COALESCE(sum(fi.quantidade*(1+fi.perda_percentual/100)*COALESCE(mat.custo_medio,0)),0) INTO v_materiais FROM public.erp_ficha_itens fi JOIN public.erp_produtos mat ON mat.id=fi.produto_id AND mat.empresa_id=v_empresa WHERE fi.ficha_id=v_ficha; END IF;
 v_custo:=v_materiais+(p_horas_mao_obra*p_custo_hora_mao_obra)+(p_horas_maquina*p_custo_hora_maquina)+p_energia+p_custos_indiretos+p_terceirizacao+p_embalagem+p_perda_refugo;
 v_preco:=CASE WHEN p_markup_percentual>0 THEN v_custo*(1+p_markup_percentual/100) ELSE COALESCE((SELECT preco_venda FROM public.erp_produtos WHERE id=p_produto_id AND empresa_id=v_empresa),0) END;
 v_margem:=v_preco-v_custo;
 INSERT INTO public.erp_custos_produtos(empresa_id,produto_id,ficha_id,tipo_calculo,materiais,mao_obra,maquinas,energia,custos_indiretos,terceirizacao,embalagem,perdas_refugo,custo_fabricacao,custo_total,quantidade_base,preco_venda,markup_percentual,margem_valor,margem_percentual) VALUES(v_empresa,p_produto_id,v_ficha,'PLANEJADO',v_materiais,p_horas_mao_obra*p_custo_hora_mao_obra,p_horas_maquina*p_custo_hora_maquina,p_energia,p_custos_indiretos,p_terceirizacao,p_embalagem,p_perda_refugo,v_custo,v_custo,p_quantidade,v_preco,p_markup_percentual,v_margem,CASE WHEN v_preco=0 THEN 0 ELSE v_margem/v_preco*100 END) RETURNING * INTO v_result;
 UPDATE public.erp_produtos SET custo_fabricacao=v_custo,markup_percentual=p_markup_percentual,margem_valor=v_margem,margem_percentual=CASE WHEN v_preco=0 THEN 0 ELSE v_margem/v_preco*100 END WHERE id=p_produto_id AND empresa_id=v_empresa;
 RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION public.erp_calcular_custo_produto(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.erp_calcular_custo_produto(uuid,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) TO authenticated;
