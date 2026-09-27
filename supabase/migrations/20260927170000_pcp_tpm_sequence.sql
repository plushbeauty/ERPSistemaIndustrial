ALTER TABLE public.erp_ordens_producao ADD COLUMN IF NOT EXISTS ordem_sequencia integer;
CREATE INDEX IF NOT EXISTS idx_erp_ordens_producao_maquina_sequencia ON public.erp_ordens_producao(maquina_id,ordem_sequencia);
ALTER TABLE public.erp_manutencao_ordens ADD COLUMN IF NOT EXISTS inicio_atendimento timestamptz;
ALTER TABLE public.erp_manutencao_ordens ADD COLUMN IF NOT EXISTS data_fechamento timestamptz;
ALTER TABLE public.erp_manutencao_ordens ADD COLUMN IF NOT EXISTS laudo_tecnico text;
ALTER TABLE public.erp_manutencao_ordens ADD COLUMN IF NOT EXISTS tecnico_id uuid;
ALTER TABLE public.erp_manutencao_ordens ADD COLUMN IF NOT EXISTS numero_os text;
ALTER TABLE public.erp_manutencao_ordens ADD COLUMN IF NOT EXISTS contador_ciclos numeric(18,2);
CREATE OR REPLACE FUNCTION public.erp_registrar_parada_manutencao(p_maquina_id uuid,p_ordem_producao_id uuid,p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_empresa uuid:=public.erp_current_empresa_id(); v_os uuid; v_num text;
BEGIN
 IF v_empresa IS NULL THEN RAISE EXCEPTION 'Empresa não identificada'; END IF;
 IF p_maquina_id IS NULL OR trim(coalesce(p_motivo,''))='' THEN RAISE EXCEPTION 'Máquina e motivo são obrigatórios'; END IF;
 UPDATE public.erp_maquinas SET status='BLOQUEADA_MANUTENCAO' WHERE id=p_maquina_id AND empresa_id=v_empresa;
 v_num:='OS-'||to_char(now(),'YYYYMMDDHH24MISS');
 INSERT INTO public.erp_manutencao_ordens(empresa_id,ativo_id,tipo,descricao,prioridade,status,data_prevista,inicio_atendimento,numero_os)
 VALUES(v_empresa,p_maquina_id,'CORRETIVA',trim(p_motivo),'ALTA','ABERTA',current_date,now(),v_num) RETURNING id INTO v_os;
 INSERT INTO public.erp_producao_paradas(empresa_id,maquina_id,ordem_producao_id,motivo,inicio,status)
 VALUES(v_empresa,p_maquina_id,p_ordem_producao_id,trim(p_motivo),now(),'ABERTA');
 RETURN jsonb_build_object('ordem_servico_id',v_os,'numero_os',v_num);
END $$;
REVOKE ALL ON FUNCTION public.erp_registrar_parada_manutencao(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_registrar_parada_manutencao(uuid,uuid,text) TO authenticated;