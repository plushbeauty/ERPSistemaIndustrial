-- SYSNQRA ERP INDUSTRIAL
-- SGQ-REL-001 — liberação transacional de lote operacional
-- REV-SGQ-REL-001-20261108-01
-- A tela usa exclusivamente erp_liberar_lote / erp_bloquear_lote.
-- Autorização operacional: nivel_admin >= 80 no tenant da sessão.
-- Master universal sem empresa_id não opera lote de tenant sem contexto de empresa.

ALTER TABLE public.erp_qualidade_liberacao_lotes
  ADD COLUMN IF NOT EXISTS lote_operacional_id uuid,
  ADD COLUMN IF NOT EXISTS localizacao_anterior text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='erp_qualidade_liberacao_lotes'
       AND column_name='quantidade' AND data_type='integer'
  ) THEN
    ALTER TABLE public.erp_qualidade_liberacao_lotes
      ALTER COLUMN quantidade TYPE numeric(14,3)
      USING quantidade::numeric(14,3);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='erp_qualidade_liberacao_lotes_empresa_codigo_uq'
       AND conrelid='public.erp_qualidade_liberacao_lotes'::regclass
  ) THEN
    ALTER TABLE public.erp_qualidade_liberacao_lotes
      DROP CONSTRAINT erp_qualidade_liberacao_lotes_empresa_codigo_uq;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname='erp_qualidade_liberacao_lotes_lote_operacional_fk'
       AND conrelid='public.erp_qualidade_liberacao_lotes'::regclass
  ) THEN
    ALTER TABLE public.erp_qualidade_liberacao_lotes
      ADD CONSTRAINT erp_qualidade_liberacao_lotes_lote_operacional_fk
      FOREIGN KEY (lote_operacional_id)
      REFERENCES public.erp_estoque_lotes(id)
      ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_erp_qualidade_liberacao_lotes_empresa_lote
  ON public.erp_qualidade_liberacao_lotes (empresa_id, lote_operacional_id)
  WHERE lote_operacional_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_erp_qualidade_liberacao_lotes_operacional
  ON public.erp_qualidade_liberacao_lotes (empresa_id, lote_operacional_id, created_at DESC)
  WHERE lote_operacional_id IS NOT NULL;

-- A tabela de decisão fica somente leitura pela Data API. Toda mudança passa pelas RPCs.
DROP POLICY IF EXISTS erp_qualidade_liberacao_lotes_insert_tenant ON public.erp_qualidade_liberacao_lotes;
DROP POLICY IF EXISTS erp_qualidade_liberacao_lotes_update_tenant ON public.erp_qualidade_liberacao_lotes;
REVOKE INSERT, UPDATE, DELETE ON public.erp_qualidade_liberacao_lotes FROM authenticated;
GRANT SELECT ON public.erp_qualidade_liberacao_lotes TO authenticated;

CREATE TABLE IF NOT EXISTS public.erp_qualidade_liberacao_lotes_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  lote_operacional_id uuid NOT NULL REFERENCES public.erp_estoque_lotes(id) ON DELETE RESTRICT,
  liberacao_id uuid NOT NULL REFERENCES public.erp_qualidade_liberacao_lotes(id) ON DELETE RESTRICT,
  acao text NOT NULL CHECK (acao IN ('LIBERAR', 'BLOQUEAR')),
  status_operacional_anterior text,
  status_operacional_novo text NOT NULL,
  localizacao_anterior text,
  localizacao_nova text,
  responsavel_id uuid REFERENCES public.erp_usuarios(id) ON DELETE SET NULL,
  nivel_admin integer NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_qualidade_liberacao_auditoria_tenant_lote
  ON public.erp_qualidade_liberacao_lotes_auditoria
     (empresa_id, lote_operacional_id, created_at DESC);

ALTER TABLE public.erp_qualidade_liberacao_lotes_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS erp_qualidade_liberacao_auditoria_select_tenant
  ON public.erp_qualidade_liberacao_lotes_auditoria;
CREATE POLICY erp_qualidade_liberacao_auditoria_select_tenant
  ON public.erp_qualidade_liberacao_lotes_auditoria
  FOR SELECT TO authenticated
  USING (empresa_id = public.erp_current_empresa_id());

GRANT SELECT ON public.erp_qualidade_liberacao_lotes_auditoria TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.erp_qualidade_liberacao_lotes_auditoria FROM authenticated;

CREATE OR REPLACE FUNCTION public.erp_qualidade_decidir_lote(
  p_lote_operacional_id uuid,
  p_acao text,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid := auth.uid();
  v_usuario_id uuid;
  v_nivel_admin integer;
  v_nome text;
  v_lote record;
  v_existente public.erp_qualidade_liberacao_lotes%ROWTYPE;
  v_decisao public.erp_qualidade_liberacao_lotes%ROWTYPE;
  v_localizacao_original text;
  v_localizacao_nova text;
  v_status_novo text;
  v_status_sgq text;
  v_auditoria_id uuid;
  v_codigo_lote text;
BEGIN
  IF v_user IS NULL OR v_empresa IS NULL THEN
    RAISE EXCEPTION 'SESSAO_EMPRESA_NAO_IDENTIFICADA' USING ERRCODE = '42501';
  END IF;
  IF p_lote_operacional_id IS NULL OR upper(coalesce(p_acao, '')) NOT IN ('LIBERAR', 'BLOQUEAR') THEN
    RAISE EXCEPTION 'DECISAO_DE_LOTE_INVALIDA' USING ERRCODE = '22023';
  END IF;

  SELECT u.id, coalesce(u.nivel_admin, 0), u.nome, u.email
    INTO v_usuario_id, v_nivel_admin, v_nome
    FROM public.erp_usuarios u
   WHERE u.auth_user_id = v_user
     AND u.empresa_id = v_empresa
     AND u.ativo = true
     AND u.deleted_at IS NULL
   FOR SHARE;
  IF NOT FOUND OR coalesce(v_nivel_admin, 0) < 80 THEN
    RAISE EXCEPTION 'SEM_AUTORIZACAO_NIVEL_ADMIN_80_PARA_DECISAO_DE_LOTE'
      USING ERRCODE = '42501';
  END IF;
  v_nome := left(coalesce(nullif(btrim(v_nome), ''), 'USUARIO'), 100);

  PERFORM pg_advisory_xact_lock(hashtext(v_empresa::text), hashtext(p_lote_operacional_id::text));

  SELECT l.id, l.empresa_id, l.produto_id, l.lote_interno, l.lote_fornecedor,
         l.quantidade_recebida, l.quantidade_disponivel, l.status_inspecao, l.localizacao
    INTO v_lote
    FROM public.erp_estoque_lotes l
   WHERE l.id = p_lote_operacional_id
     AND l.empresa_id = v_empresa
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LOTE_OPERACIONAL_NAO_ENCONTRADO_NA_EMPRESA';
  END IF;
  IF coalesce(v_lote.quantidade_disponivel, 0) <= 0 THEN
    RAISE EXCEPTION 'LOTE_SEM_QUANTIDADE_DISPONIVEL_PARA_DECISAO';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.erp_produtos p
     WHERE p.id = v_lote.produto_id
       AND p.empresa_id = v_empresa
       AND p.ativo = true
  ) THEN
    RAISE EXCEPTION 'PRODUTO_DO_LOTE_NAO_PERTENCE_A_EMPRESA';
  END IF;

  SELECT q.*
    INTO v_existente
    FROM public.erp_qualidade_liberacao_lotes q
   WHERE q.empresa_id = v_empresa
     AND q.lote_operacional_id = p_lote_operacional_id
   FOR UPDATE;

  v_localizacao_original := coalesce(
    v_existente.localizacao_anterior,
    CASE
      WHEN lower(coalesce(v_lote.localizacao, '')) = lower('Quarentena') THEN 'Estoque'
      ELSE v_lote.localizacao
    END,
    'Estoque'
  );
  v_codigo_lote := left(coalesce(
    nullif(btrim(v_lote.lote_interno), ''),
    nullif(btrim(v_lote.lote_fornecedor), ''),
    v_lote.id::text
  ), 50);

  IF upper(p_acao) = 'BLOQUEAR' THEN
    IF length(btrim(coalesce(p_observacoes, ''))) < 5 THEN
      RAISE EXCEPTION 'JUSTIFICATIVA_OBRIGATORIA_PARA_BLOQUEAR_LOTE';
    END IF;
    v_status_novo := 'BLOQUEADO';
    v_status_sgq := 'REPROVADO';
    v_localizacao_nova := 'Quarentena';
  ELSE
    IF upper(coalesce(v_lote.status_inspecao, '')) IN ('BLOQUEADO', 'REPROVADO')
       AND length(btrim(coalesce(p_observacoes, ''))) < 5 THEN
      RAISE EXCEPTION 'JUSTIFICATIVA_OBRIGATORIA_PARA_LIBERAR_LOTE_BLOQUEADO';
    END IF;
    v_status_novo := 'APROVADO';
    v_status_sgq := 'APROVADO';
    v_localizacao_nova := v_localizacao_original;
  END IF;

  IF v_existente.id IS NOT NULL
     AND upper(coalesce(v_lote.status_inspecao, '')) = v_status_novo
     AND v_existente.status_sgq = v_status_sgq THEN
    RETURN jsonb_build_object(
      'registro', to_jsonb(v_existente),
      'lote', jsonb_build_object(
        'status_inspecao', v_lote.status_inspecao,
        'localizacao', v_lote.localizacao
      ),
      'auditoria_id', NULL,
      'sem_alteracao', true
    );
  END IF;

  UPDATE public.erp_estoque_lotes
     SET status_inspecao = v_status_novo,
         localizacao = v_localizacao_nova
   WHERE id = p_lote_operacional_id
     AND empresa_id = v_empresa;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'FALHA_AO_ATUALIZAR_STATUS_OPERACIONAL_DO_LOTE';
  END IF;

  INSERT INTO public.erp_qualidade_liberacao_lotes (
    empresa_id, lote_operacional_id, codigo_lote, produto_id, quantidade,
    status_sgq, responsavel_liberacao, observacoes, localizacao_anterior, criado_por
  )
  VALUES (
    v_empresa, p_lote_operacional_id, v_codigo_lote, v_lote.produto_id,
    coalesce(v_lote.quantidade_disponivel, v_lote.quantidade_recebida, 0),
    v_status_sgq, v_nome, nullif(btrim(p_observacoes), ''),
    v_localizacao_original, v_user
  )
  ON CONFLICT (empresa_id, lote_operacional_id)
    WHERE lote_operacional_id IS NOT NULL
  DO UPDATE SET
    codigo_lote = EXCLUDED.codigo_lote,
    produto_id = EXCLUDED.produto_id,
    quantidade = EXCLUDED.quantidade,
    status_sgq = EXCLUDED.status_sgq,
    responsavel_liberacao = EXCLUDED.responsavel_liberacao,
    observacoes = EXCLUDED.observacoes,
    localizacao_anterior = EXCLUDED.localizacao_anterior,
    updated_at = now()
  RETURNING * INTO v_decisao;

  INSERT INTO public.erp_qualidade_liberacao_lotes_auditoria (
    empresa_id, lote_operacional_id, liberacao_id, acao,
    status_operacional_anterior, status_operacional_novo,
    localizacao_anterior, localizacao_nova,
    responsavel_id, nivel_admin, observacoes
  )
  VALUES (
    v_empresa, p_lote_operacional_id, v_decisao.id, upper(p_acao),
    v_lote.status_inspecao, v_status_novo,
    v_lote.localizacao, v_localizacao_nova,
    v_usuario_id, v_nivel_admin, nullif(btrim(p_observacoes), '')
  )
  RETURNING id INTO v_auditoria_id;

  RETURN jsonb_build_object(
    'registro', to_jsonb(v_decisao),
    'lote', jsonb_build_object(
      'status_inspecao', v_status_novo,
      'localizacao', v_localizacao_nova
    ),
    'auditoria_id', v_auditoria_id,
    'sem_alteracao', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.erp_liberar_lote(
  p_lote_operacional_id uuid,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.erp_qualidade_decidir_lote(p_lote_operacional_id, 'LIBERAR', p_observacoes);
$$;

CREATE OR REPLACE FUNCTION public.erp_bloquear_lote(
  p_lote_operacional_id uuid,
  p_observacoes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT public.erp_qualidade_decidir_lote(p_lote_operacional_id, 'BLOQUEAR', p_observacoes);
$$;

REVOKE ALL ON FUNCTION public.erp_qualidade_decidir_lote(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.erp_liberar_lote(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.erp_bloquear_lote(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.erp_liberar_lote(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.erp_bloquear_lote(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
