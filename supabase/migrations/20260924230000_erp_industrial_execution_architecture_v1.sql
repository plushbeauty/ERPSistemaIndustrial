/*
 * REV-080 — Industrial execution architecture hardening
 * References used as architectural patterns only:
 * - Carbon: ERP/MES/QMS + BOM/MRP + Supabase/PostgreSQL
 * - Terras: BOM -> manufacturing order -> work-order/resource planning
 * - OpenMES: finite scheduling / work-center execution / traceability
 * - MonoPilot: technical BOM/routing separated from planning/production/quality
 *
 * No source code is copied from third-party projects.
 */

ALTER TABLE public.erp_ficha_operacoes
  ADD COLUMN IF NOT EXISTS centro_trabalho text,
  ADD COLUMN IF NOT EXISTS equipamento text,
  ADD COLUMN IF NOT EXISTS ferramenta text,
  ADD COLUMN IF NOT EXISTS capacidade_hora numeric(18,6),
  ADD COLUMN IF NOT EXISTS capacidade_dia numeric(18,6);

CREATE INDEX IF NOT EXISTS idx_erp_ficha_operacoes_centro_trabalho
  ON public.erp_ficha_operacoes (empresa_id, centro_trabalho, ficha_id, sequencia);

CREATE TABLE IF NOT EXISTS public.erp_mrp_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.erp_empresas(id),
  produto_raiz_id uuid NOT NULL REFERENCES public.erp_produtos(id),
  quantidade_raiz numeric(18,6) NOT NULL CHECK (quantidade_raiz > 0),
  demanda_ref text,
  status text NOT NULL DEFAULT 'CALCULADO'
    CHECK (status IN ('CALCULADO','APROVADO','CANCELADO')),
  criado_por uuid REFERENCES public.erp_usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.erp_mrp_necessidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.erp_empresas(id),
  run_id uuid NOT NULL REFERENCES public.erp_mrp_runs(id) ON DELETE CASCADE,
  produto_raiz_id uuid NOT NULL REFERENCES public.erp_produtos(id),
  componente_id uuid NOT NULL REFERENCES public.erp_produtos(id),
  nivel integer NOT NULL CHECK (nivel >= 1),
  quantidade_bruta numeric(18,6) NOT NULL CHECK (quantidade_bruta >= 0),
  estoque_atual numeric(18,6) NOT NULL DEFAULT 0,
  reservado numeric(18,6) NOT NULL DEFAULT 0,
  quantidade_disponivel numeric(18,6) NOT NULL DEFAULT 0,
  necessidade_liquida numeric(18,6) NOT NULL DEFAULT 0,
  sugestao text NOT NULL DEFAULT 'SEM_NECESSIDADE'
    CHECK (sugestao IN ('SEM_NECESSIDADE','COMPRAR','PRODUZIR')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_mrp_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_mrp_necessidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS erp_mrp_runs_tenant ON public.erp_mrp_runs;
CREATE POLICY erp_mrp_runs_tenant ON public.erp_mrp_runs
  FOR ALL TO authenticated
  USING (empresa_id = public.erp_current_empresa_id() OR public.erp_is_master())
  WITH CHECK (empresa_id = public.erp_current_empresa_id() OR public.erp_is_master());

DROP POLICY IF EXISTS erp_mrp_necessidades_tenant ON public.erp_mrp_necessidades;
CREATE POLICY erp_mrp_necessidades_tenant ON public.erp_mrp_necessidades
  FOR ALL TO authenticated
  USING (empresa_id = public.erp_current_empresa_id() OR public.erp_is_master())
  WITH CHECK (empresa_id = public.erp_current_empresa_id() OR public.erp_is_master());

CREATE INDEX IF NOT EXISTS idx_erp_mrp_runs_empresa_created
  ON public.erp_mrp_runs (empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_erp_mrp_nec_run_componente
  ON public.erp_mrp_necessidades (empresa_id, run_id, componente_id);

CREATE OR REPLACE FUNCTION public.erp_mrp_explodir(
  p_produto_id uuid,
  p_quantidade numeric,
  p_demanda_ref text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_empresa uuid := public.erp_current_empresa_id();
  v_run uuid;
BEGIN
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'ERP_TENANT_NOT_FOUND';
  END IF;

  IF p_produto_id IS NULL OR p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'MRP_INVALID_INPUT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.erp_produtos p
    WHERE p.id = p_produto_id
      AND p.empresa_id = v_empresa
      AND p.ativo = true
  ) THEN
    RAISE EXCEPTION 'MRP_PRODUCT_NOT_IN_TENANT';
  END IF;

  INSERT INTO public.erp_mrp_runs (
    empresa_id, produto_raiz_id, quantidade_raiz, demanda_ref, criado_por
  )
  SELECT v_empresa, p_produto_id, p_quantidade, p_demanda_ref, u.id
  FROM public.erp_usuarios u
  WHERE u.auth_user_id = auth.uid()
    AND u.empresa_id = v_empresa
    AND u.ativo = true
  LIMIT 1
  RETURNING id INTO v_run;

  IF v_run IS NULL THEN
    RAISE EXCEPTION 'MRP_USER_NOT_AUTHORIZED';
  END IF;

  WITH RECURSIVE explosao AS (
    SELECT
      fi.componente_id,
      1 AS nivel,
      p_quantidade * fi.quantidade * (1 + fi.perda_percentual / 100.0) AS quantidade,
      ARRAY[p_produto_id, fi.componente_id]::uuid[] AS caminho
    FROM public.erp_ficha_itens fi
    JOIN public.erp_fichas_tecnicas f
      ON f.id = fi.ficha_id
     AND f.empresa_id = v_empresa
     AND f.produto_id = p_produto_id
     AND f.ativa = true
    WHERE fi.empresa_id = v_empresa

    UNION ALL

    SELECT
      child.componente_id,
      e.nivel + 1,
      e.quantidade * child.quantidade * (1 + child.perda_percentual / 100.0),
      e.caminho || child.componente_id
    FROM explosao e
    JOIN public.erp_fichas_tecnicas cf
      ON cf.empresa_id = v_empresa
     AND cf.produto_id = e.componente_id
     AND cf.ativa = true
    JOIN public.erp_ficha_itens child
      ON child.ficha_id = cf.id
     AND child.empresa_id = v_empresa
    WHERE e.nivel < 50
      AND NOT child.componente_id = ANY(e.caminho)
  ),
  consol AS (
    SELECT componente_id, max(nivel) AS nivel, sum(quantidade) AS quantidade_bruta
    FROM explosao
    GROUP BY componente_id
  )
  INSERT INTO public.erp_mrp_necessidades (
    empresa_id, run_id, produto_raiz_id, componente_id, nivel,
    quantidade_bruta, estoque_atual, reservado, quantidade_disponivel,
    necessidade_liquida, sugestao
  )
  SELECT
    v_empresa,
    v_run,
    p_produto_id,
    c.componente_id,
    c.nivel,
    c.quantidade_bruta,
    COALESCE(p.estoque_atual, 0),
    COALESCE((
      SELECT sum(r.quantidade)
      FROM public.erp_estoque_reservas r
      WHERE r.empresa_id = v_empresa
        AND r.produto_id = c.componente_id
    ), 0),
    GREATEST(
      COALESCE(p.estoque_atual, 0) -
      COALESCE((
        SELECT sum(r.quantidade)
        FROM public.erp_estoque_reservas r
        WHERE r.empresa_id = v_empresa
          AND r.produto_id = c.componente_id
      ), 0),
      0
    ),
    GREATEST(
      c.quantidade_bruta -
      GREATEST(
        COALESCE(p.estoque_atual, 0) -
        COALESCE((
          SELECT sum(r.quantidade)
          FROM public.erp_estoque_reservas r
          WHERE r.empresa_id = v_empresa
            AND r.produto_id = c.componente_id
        ), 0),
        0
      ),
      0
    ),
    CASE
      WHEN GREATEST(
        c.quantidade_bruta -
        GREATEST(
          COALESCE(p.estoque_atual, 0) -
          COALESCE((
            SELECT sum(r.quantidade)
            FROM public.erp_estoque_reservas r
            WHERE r.empresa_id = v_empresa
              AND r.produto_id = c.componente_id
          ), 0),
          0
        ),
        0
      ) = 0 THEN 'SEM_NECESSIDADE'
      WHEN COALESCE(p.fabricado, false) THEN 'PRODUZIR'
      ELSE 'COMPRAR'
    END
  FROM consol c
  JOIN public.erp_produtos p
    ON p.id = c.componente_id
   AND p.empresa_id = v_empresa;

  RETURN v_run;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_mrp_explodir(uuid, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.erp_mrp_explodir(uuid, numeric, text) TO authenticated;
