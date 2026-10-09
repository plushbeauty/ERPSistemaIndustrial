-- Approval gate for engineering revisions consumed by MRP/PCP.
-- The master criteria are maintained by Quality; only the guarded RPC may activate a revision.
create or replace function public.erp_guard_ficha_tecnica_status()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.status, 'rascunho') <> 'rascunho' then
      raise exception 'Nova ficha técnica deve iniciar em rascunho e passar pela aprovação formal.';
    end if;
    return new;
  end if;

  if (new.status is distinct from old.status or new.ativa is distinct from old.ativa)
     and coalesce(current_setting('app.erp_ficha_approval', true), '') <> 'approval' then
    raise exception 'Status e ativação da ficha técnica só podem ser alterados pelo fluxo formal de aprovação.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_guard_ficha_tecnica_insert on public.erp_fichas_tecnicas;
create trigger trg_erp_guard_ficha_tecnica_insert
before insert on public.erp_fichas_tecnicas
for each row execute function public.erp_guard_ficha_tecnica_status();

drop trigger if exists trg_erp_guard_ficha_tecnica_status on public.erp_fichas_tecnicas;
create trigger trg_erp_guard_ficha_tecnica_status
before update of status, ativa on public.erp_fichas_tecnicas
for each row execute function public.erp_guard_ficha_tecnica_status();

create or replace function public.erp_qualidade_aprovar_ficha_tecnica(p_ficha_id uuid)
returns public.erp_fichas_tecnicas
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_ficha public.erp_fichas_tecnicas;
begin
  if not public.erp_is_master() and not public.erp_has_permission('qualidade', 'aprovar') then
    raise exception 'Sem permissão para aprovar/liberar ficha técnica.';
  end if;

  select f.* into v_ficha
  from public.erp_fichas_tecnicas f
  where f.id = p_ficha_id
    and (public.erp_is_master() or f.empresa_id = v_empresa)
  for update;

  if not found then raise exception 'Ficha técnica não encontrada na empresa autorizada.'; end if;
  if v_ficha.status not in ('rascunho', 'em_analise') then
    raise exception 'Somente uma ficha em rascunho ou análise pode ser aprovada.';
  end if;
  if not exists (
    select 1 from public.erp_ficha_itens i
    where i.empresa_id = v_ficha.empresa_id and i.ficha_id = v_ficha.id
  ) then raise exception 'A ficha precisa ter pelo menos um componente BOM antes da aprovação.'; end if;
  if not exists (
    select 1 from public.erp_ficha_operacoes o
    where o.empresa_id = v_ficha.empresa_id and o.ficha_id = v_ficha.id
  ) then raise exception 'A ficha precisa ter pelo menos uma operação de roteiro antes da aprovação.'; end if;

  perform set_config('app.erp_ficha_approval', 'approval', true);
  update public.erp_fichas_tecnicas
  set ativa = false, status = 'obsoleta', updated_at = now()
  where empresa_id = v_ficha.empresa_id
    and produto_id = v_ficha.produto_id
    and id <> v_ficha.id
    and ativa = true;

  update public.erp_fichas_tecnicas
  set ativa = true, status = 'aprovada', updated_at = now()
  where id = v_ficha.id and empresa_id = v_ficha.empresa_id
  returning * into v_ficha;

  return v_ficha;
end;
$$;

revoke all on function public.erp_qualidade_aprovar_ficha_tecnica(uuid) from public, anon;
revoke all on function public.erp_guard_ficha_tecnica_status() from public, anon, authenticated;
grant execute on function public.erp_qualidade_aprovar_ficha_tecnica(uuid) to authenticated;

-- Enforce approved revisions and use output yield in the multilevel BOM explosion.
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
  v_missing uuid;
BEGIN
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'ERP_TENANT_NOT_FOUND';
  END IF;

  IF p_produto_id IS NULL OR p_quantidade IS NULL OR p_quantidade <= 0 THEN
    RAISE EXCEPTION 'MRP_INVALID_INPUT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.erp_produtos p
    WHERE p.id = p_produto_id AND p.empresa_id = v_empresa AND p.ativo = true
  ) THEN
    RAISE EXCEPTION 'MRP_PRODUCT_NOT_IN_TENANT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.erp_fichas_tecnicas f
    WHERE f.empresa_id = v_empresa AND f.produto_id = p_produto_id AND f.ativa = true
      AND lower(coalesce(f.status, '')) IN ('aprovada', 'liberada')
  ) THEN RAISE EXCEPTION 'MRP_PROCESS_SHEET_NOT_APPROVED'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.erp_fichas_tecnicas f
    WHERE f.empresa_id = v_empresa AND f.produto_id = p_produto_id AND f.ativa = true
      AND lower(coalesce(f.status, '')) IN ('aprovada', 'liberada')
      AND coalesce(f.rendimento, 0) <= 0
  ) THEN RAISE EXCEPTION 'MRP_PROCESS_SHEET_INVALID_YIELD'; END IF;


  -- Manufactured components must have an approved, valid child BOM; otherwise do not treat them as purchasable.
  WITH RECURSIVE explosao_validacao AS (
    SELECT fi.componente_id, 1 AS nivel,
      p_quantidade / NULLIF(f.rendimento, 0) * fi.quantidade * (1 + fi.perda_percentual / 100.0) AS quantidade,
      ARRAY[p_produto_id, fi.componente_id]::uuid[] AS caminho
    FROM public.erp_ficha_itens fi
    JOIN public.erp_fichas_tecnicas f ON f.id = fi.ficha_id
      AND f.empresa_id = v_empresa AND f.produto_id = p_produto_id AND f.ativa = true
      AND lower(coalesce(f.status, '')) IN ('aprovada', 'liberada')
    WHERE fi.empresa_id = v_empresa
    UNION ALL
    SELECT child.componente_id, e.nivel + 1,
      e.quantidade / NULLIF(cf.rendimento, 0) * child.quantidade * (1 + child.perda_percentual / 100.0),
      e.caminho || child.componente_id
    FROM explosao_validacao e
    JOIN public.erp_fichas_tecnicas cf ON cf.empresa_id = v_empresa
      AND cf.produto_id = e.componente_id AND cf.ativa = true
      AND lower(coalesce(cf.status, '')) IN ('aprovada', 'liberada')
    JOIN public.erp_ficha_itens child ON child.ficha_id = cf.id AND child.empresa_id = v_empresa
    WHERE e.nivel < 50 AND NOT child.componente_id = ANY(e.caminho)
  )
  SELECT e.componente_id INTO v_missing
  FROM explosao_validacao e
  JOIN public.erp_produtos p ON p.id = e.componente_id AND p.empresa_id = v_empresa
  LEFT JOIN LATERAL (
    SELECT f.id, f.rendimento FROM public.erp_fichas_tecnicas f
    WHERE f.empresa_id = v_empresa AND f.produto_id = e.componente_id AND f.ativa = true
      AND lower(coalesce(f.status, '')) IN ('aprovada', 'liberada')
    ORDER BY f.versao DESC LIMIT 1
  ) child_ficha ON true
  WHERE coalesce(p.fabricado, false) = true
    AND (child_ficha.id IS NULL OR coalesce(child_ficha.rendimento, 0) <= 0)
  LIMIT 1;

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'MRP_COMPONENT_PROCESS_SHEET_NOT_APPROVED_OR_INVALID:%', v_missing;
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
      p_quantidade / NULLIF(f.rendimento, 0) * fi.quantidade * (1 + fi.perda_percentual / 100.0) AS quantidade,
      ARRAY[p_produto_id, fi.componente_id]::uuid[] AS caminho
    FROM public.erp_ficha_itens fi
    JOIN public.erp_fichas_tecnicas f
      ON f.id = fi.ficha_id
     AND f.empresa_id = v_empresa
     AND f.produto_id = p_produto_id
     AND f.ativa = true
     AND lower(coalesce(f.status, '')) IN ('aprovada', 'liberada')
    WHERE fi.empresa_id = v_empresa

    UNION ALL

    SELECT
      child.componente_id,
      e.nivel + 1,
      e.quantidade / NULLIF(cf.rendimento, 0) * child.quantidade * (1 + child.perda_percentual / 100.0),
      e.caminho || child.componente_id
    FROM explosao e
    JOIN public.erp_fichas_tecnicas cf
      ON cf.empresa_id = v_empresa
     AND cf.produto_id = e.componente_id
     AND cf.ativa = true
     AND lower(coalesce(cf.status, '')) IN ('aprovada', 'liberada')
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

-- Save a process-sheet draft and all BOM/route rows in one database transaction.
CREATE OR REPLACE FUNCTION public.erp_salvar_ficha_tecnica_rascunho(
  p_produto_id uuid,
  p_versao integer,
  p_codigo text,
  p_titulo text,
  p_rendimento numeric,
  p_unidade_rendimento text,
  p_observacoes jsonb,
  p_itens jsonb,
  p_operacoes jsonb
)
RETURNS public.erp_fichas_tecnicas
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_empresa uuid := public.erp_current_empresa_id();
  v_ficha public.erp_fichas_tecnicas;
BEGIN
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'ERP_TENANT_NOT_FOUND';
  END IF;
  IF p_produto_id IS NULL OR p_versao IS NULL OR p_versao < 1 THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_INVALID_INPUT';
  END IF;
  IF p_rendimento IS NULL OR p_rendimento <= 0 OR NULLIF(btrim(coalesce(p_unidade_rendimento, '')), '') IS NULL THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_INVALID_YIELD';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.erp_produtos p
    WHERE p.id = p_produto_id AND p.empresa_id = v_empresa AND p.ativo = true
  ) THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_PRODUCT_NOT_IN_TENANT';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.erp_fichas_tecnicas f
    WHERE f.empresa_id = v_empresa AND f.produto_id = p_produto_id AND f.versao >= p_versao
  ) THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_REVISION_MUST_INCREASE';
  END IF;
  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_BOM_REQUIRED';
  END IF;
  IF p_operacoes IS NULL OR jsonb_typeof(p_operacoes) <> 'array' OR jsonb_array_length(p_operacoes) = 0 THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_ROUTE_REQUIRED';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_itens) AS items(item)
    LEFT JOIN public.erp_produtos p
      ON p.id = NULLIF(items.item->>'componente_id', '')::uuid
     AND p.empresa_id = v_empresa
     AND p.ativo = true
    WHERE p.id IS NULL
  ) THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_COMPONENT_NOT_IN_TENANT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_operacoes) AS operations(item)
    LEFT JOIN public.erp_maquinas m
      ON m.id = NULLIF(operations.item->>'maquina_id', '')::uuid
     AND m.empresa_id = v_empresa
     AND upper(coalesce(m.status, '')) <> 'INATIVA'
    WHERE NULLIF(operations.item->>'maquina_id', '') IS NOT NULL
      AND m.id IS NULL
  ) THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_MACHINE_NOT_IN_TENANT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_operacoes) AS operations(item)
    LEFT JOIN public.erp_moldes mold
      ON mold.id = NULLIF(operations.item->>'molde_id', '')::uuid
     AND mold.empresa_id = v_empresa
     AND mold.ativo = true
    WHERE NULLIF(operations.item->>'molde_id', '') IS NOT NULL
      AND mold.id IS NULL
  ) THEN
    RAISE EXCEPTION 'ERP_PROCESS_SHEET_MOLD_NOT_IN_TENANT';
  END IF;

  INSERT INTO public.erp_fichas_tecnicas (
    empresa_id, produto_id, versao, revisao, codigo, titulo, status,
    rendimento, unidade_rendimento, observacoes, ativa
  )
  VALUES (
    v_empresa, p_produto_id, p_versao, p_versao::text,
    NULLIF(btrim(coalesce(p_codigo, '')), ''),
    NULLIF(btrim(coalesce(p_titulo, '')), ''),
    'rascunho', p_rendimento, btrim(p_unidade_rendimento),
    p_observacoes::text, false
  )
  RETURNING * INTO v_ficha;

  INSERT INTO public.erp_ficha_itens (
    empresa_id, ficha_id, componente_id, quantidade, perda_percentual,
    lote_obrigatorio, tipo_item, sequencia
  )
  SELECT
    v_empresa, v_ficha.id,
    (item->>'componente_id')::uuid,
    (item->>'quantidade')::numeric,
    COALESCE(NULLIF(item->>'perda_percentual', '')::numeric, 0),
    COALESCE(NULLIF(item->>'lote_obrigatorio', '')::boolean, false),
    COALESCE(NULLIF(item->>'tipo_item', ''), 'COMPRADO'),
    COALESCE(NULLIF(item->>'sequencia', '')::integer, 10)
  FROM jsonb_array_elements(p_itens) AS items(item);

  INSERT INTO public.erp_ficha_operacoes (
    empresa_id, ficha_id, sequencia, operacao, maquina_id, molde_id,
    setup_min, ciclo_seg, instrucoes
  )
  SELECT
    v_empresa, v_ficha.id,
    COALESCE(NULLIF(item->>'sequencia', '')::integer, 10),
    btrim(coalesce(item->>'operacao', '')),
    NULLIF(item->>'maquina_id', '')::uuid,
    NULLIF(item->>'molde_id', '')::uuid,
    COALESCE(NULLIF(item->>'setup_min', '')::numeric, 0),
    COALESCE(NULLIF(item->>'ciclo_seg', '')::numeric, 0),
    NULLIF(btrim(coalesce(item->>'instrucoes', '')), '')
  FROM jsonb_array_elements(p_operacoes) AS operations(item);

  RETURN v_ficha;
END;
$$;

REVOKE ALL ON FUNCTION public.erp_salvar_ficha_tecnica_rascunho(uuid, integer, text, text, numeric, text, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.erp_salvar_ficha_tecnica_rascunho(uuid, integer, text, text, numeric, text, jsonb, jsonb, jsonb) TO authenticated;
