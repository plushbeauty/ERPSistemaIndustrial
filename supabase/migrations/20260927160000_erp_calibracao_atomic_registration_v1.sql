-- Atomic metrology calibration registration.
-- Applied to the ERP Industrial Supabase project and kept here as source-of-truth migration.

CREATE UNIQUE INDEX IF NOT EXISTS ux_erp_cal_hist_empresa_equip_revisao
  ON public.erp_qualidade_calibracoes_historico (empresa_id, equipamento_id, revisao);

CREATE OR REPLACE FUNCTION public.erp_registrar_calibracao(
  p_equipamento_id uuid,
  p_numero_certificado text,
  p_data_calibracao date,
  p_proxima_calibracao date,
  p_laboratorio text DEFAULT NULL,
  p_resultado text DEFAULT 'Aprovado',
  p_observacao text DEFAULT NULL,
  p_certificado_rbc text DEFAULT NULL
) RETURNS TABLE(revisao integer, status text)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_empresa_id uuid;
  v_revisao integer;
  v_status text;
  v_resultado text := lower(trim(coalesce(p_resultado, '')));
BEGIN
  v_empresa_id := public.erp_current_empresa_id();
  IF v_empresa_id IS NULL THEN RAISE EXCEPTION 'Empresa da sessão não identificada.'; END IF;
  IF nullif(trim(coalesce(p_numero_certificado,'')), '') IS NULL THEN RAISE EXCEPTION 'Número do certificado é obrigatório.'; END IF;
  IF p_data_calibracao IS NULL THEN RAISE EXCEPTION 'Data da calibração é obrigatória.'; END IF;
  IF p_proxima_calibracao IS NOT NULL AND p_proxima_calibracao < p_data_calibracao THEN RAISE EXCEPTION 'A próxima calibração não pode anteceder a calibração registrada.'; END IF;
  IF v_resultado NOT IN ('aprovado','reprovado','condicional') THEN RAISE EXCEPTION 'Resultado de calibração inválido.'; END IF;

  PERFORM 1
    FROM public.erp_equipamentos_medicao e
    WHERE e.id = p_equipamento_id
      AND e.empresa_id = v_empresa_id
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Instrumento não localizado na empresa da sessão.'; END IF;

  SELECT coalesce(max(h.revisao), 0) + 1
    INTO v_revisao
    FROM public.erp_qualidade_calibracoes_historico h
   WHERE h.empresa_id = v_empresa_id
     AND h.equipamento_id = p_equipamento_id;

  v_status := CASE
    WHEN v_resultado = 'aprovado'
      AND p_proxima_calibracao IS NOT NULL
      AND p_proxima_calibracao >= current_date
    THEN 'APROVADO'
    ELSE 'BLOQUEADO'
  END;

  INSERT INTO public.erp_qualidade_calibracoes_historico (
    empresa_id, equipamento_id, revisao, numero_certificado, data_calibracao,
    proxima_calibracao, laboratorio, resultado, observacao, certificado_rbc
  ) VALUES (
    v_empresa_id, p_equipamento_id, v_revisao, trim(p_numero_certificado), p_data_calibracao,
    p_proxima_calibracao, nullif(trim(p_laboratorio), ''), p_resultado,
    nullif(trim(p_observacao), ''), nullif(trim(p_certificado_rbc), '')
  );

  UPDATE public.erp_equipamentos_medicao
     SET proxima_calibracao = p_proxima_calibracao,
         certificado_validade = p_proxima_calibracao,
         certificado_rbc = nullif(trim(p_certificado_rbc), ''),
         status = v_status,
         observacoes = coalesce(nullif(trim(p_observacao), ''), observacoes)
   WHERE id = p_equipamento_id
     AND empresa_id = v_empresa_id;

  RETURN QUERY SELECT v_revisao, v_status;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_registrar_calibracao(uuid,text,date,date,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erp_registrar_calibracao(uuid,text,date,date,text,text,text,text) TO authenticated;
