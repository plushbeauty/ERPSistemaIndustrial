-- Atomic quality inspection + blocked lot + quarantine location. Existing RLS policies remain unchanged.
create or replace function public.erp_salvar_inspecao_lote(
  p_tipo text,
  p_produto_id uuid,
  p_lote_id uuid,
  p_quantidade_total numeric,
  p_tamanho_amostra integer,
  p_medicoes jsonb,
  p_resultado text,
  p_observacoes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_empresa_id uuid;
  v_user_id uuid;
  v_inspecao_id uuid;
  v_lote_empresa uuid;
  v_produto_lote uuid;
  v_lote_numero text;
  v_medicoes jsonb;
  v_resultado text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode = '28000';
  end if;

  v_empresa_id := public.erp_current_empresa_id();
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.' using errcode = '42501';
  end if;

  if p_tipo not in ('recebimento', 'processo', 'produto_final') then
    raise exception 'Tipo de inspeção inválido.' using errcode = '22023';
  end if;
  if p_resultado not in ('aprovado', 'reprovado', 'aprovado_com_restricao') then
    raise exception 'Resultado de inspeção inválido.' using errcode = '22023';
  end if;
  if p_quantidade_total < 0 or p_tamanho_amostra < 0 or jsonb_typeof(p_medicoes) <> 'array' then
    raise exception 'Quantidade, amostra ou medições inválidas.' using errcode = '22023';
  end if;

  select l.empresa_id, l.produto_id, l.numero_lote
    into v_lote_empresa, v_produto_lote, v_lote_numero
  from public.estoque_lotes l
  where l.id = p_lote_id
  for update;

  if not found or v_lote_empresa <> v_empresa_id or v_produto_lote <> p_produto_id then
    raise exception 'Lote não encontrado na empresa ativa ou produto incompatível.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.engenharia_produtos p
    where p.id = p_produto_id and p.empresa_id = v_empresa_id and p.ativo = true
  ) then
    raise exception 'Produto não encontrado ou inativo.' using errcode = '22023';
  end if;

  v_medicoes := p_medicoes;
  v_resultado := p_resultado;
  if exists (
    select 1 from jsonb_array_elements(v_medicoes) m
    where coalesce(m->>'status', '') = 'fail'
  ) then
    v_resultado := 'reprovado';
  end if;

  insert into public.qualidade_inspecoes (
    empresa_id, tipo, produto_id, lote_id, quantidade_total,
    tamanho_amostra, medicoes, resultado, inspetor_id, observacoes
  ) values (
    v_empresa_id, p_tipo, p_produto_id, p_lote_id, p_quantidade_total,
    p_tamanho_amostra, v_medicoes, v_resultado, v_user_id, nullif(btrim(p_observacoes), '')
  ) returning id into v_inspecao_id;

  if v_resultado = 'reprovado' then
    update public.estoque_lotes
      set status = 'bloqueado'
    where id = p_lote_id and empresa_id = v_empresa_id;

    -- Mirror the hold into the industrial lot ledger when the exact same lot UUID exists.
    update public.erp_estoque_lotes
      set localizacao = 'Quarentena', status_inspecao = 'REPROVADO'
    where id = p_lote_id and empresa_id = v_empresa_id;

    if exists (
      select 1 from public.erp_estoque_lotes e
      where e.id = p_lote_id and e.empresa_id = v_empresa_id
    ) and not exists (
      select 1 from public.erp_quarentenas_lotes q
      where q.lote_id = p_lote_id and q.empresa_id = v_empresa_id and q.status = 'RETIDO'
    ) then
      insert into public.erp_quarentenas_lotes (
        empresa_id, lote_id, motivo, status, criado_por
      ) values (
        v_empresa_id, p_lote_id,
        left('Inspeção reprovada ' || v_inspecao_id::text || ': ' || coalesce(nullif(btrim(p_observacoes), ''), 'medição fora da tolerância'), 500),
        'RETIDO', v_user_id
      );
    end if;
  end if;

  return v_inspecao_id;
end;
$function$;

revoke all on function public.erp_salvar_inspecao_lote(text, uuid, uuid, numeric, integer, jsonb, text, text) from public, anon;
grant execute on function public.erp_salvar_inspecao_lote(text, uuid, uuid, numeric, integer, jsonb, text, text) to authenticated;
