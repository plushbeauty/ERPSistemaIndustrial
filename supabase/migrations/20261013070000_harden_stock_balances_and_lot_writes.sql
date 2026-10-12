begin;
alter table public.estoque_saldos enable row level security;
alter table public.estoque_lotes enable row level security;
revoke all on table public.estoque_saldos from anon;
revoke all on table public.estoque_lotes from anon;

drop policy if exists estoque_saldos_select_guard on public.estoque_saldos;
create policy estoque_saldos_select_guard on public.estoque_saldos as restrictive for select to authenticated
using ((empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) and
  (public.erp_is_master() or public.erp_has_permission('estoque', 'ver') or public.erp_has_permission('estoque', 'movimentar')
   or public.erp_has_permission('qualidade', 'ver') or public.erp_has_permission('fiscal', 'ver')));

drop policy if exists estoque_saldos_insert_guard on public.estoque_saldos;
create policy estoque_saldos_insert_guard on public.estoque_saldos as restrictive for insert to authenticated with check (false);
drop policy if exists estoque_saldos_update_guard on public.estoque_saldos;
create policy estoque_saldos_update_guard on public.estoque_saldos as restrictive for update to authenticated using (false) with check (false);
drop policy if exists estoque_saldos_delete_guard on public.estoque_saldos;
create policy estoque_saldos_delete_guard on public.estoque_saldos as restrictive for delete to authenticated using (false);

drop policy if exists estoque_lotes_select_guard on public.estoque_lotes;
create policy estoque_lotes_select_guard on public.estoque_lotes as restrictive for select to authenticated
using ((empresa_id = public.erp_current_empresa_id() or public.erp_is_master()) and
  (public.erp_is_master() or public.erp_has_permission('estoque', 'ver') or public.erp_has_permission('estoque', 'movimentar')
   or public.erp_has_permission('qualidade', 'ver') or public.erp_has_permission('fiscal', 'ver') or public.erp_has_permission('fiscal', 'editar')));

drop policy if exists estoque_lotes_insert_guard on public.estoque_lotes;
create policy estoque_lotes_insert_guard on public.estoque_lotes as restrictive for insert to authenticated with check (false);
drop policy if exists estoque_lotes_update_guard on public.estoque_lotes;
create policy estoque_lotes_update_guard on public.estoque_lotes as restrictive for update to authenticated using (false) with check (false);
drop policy if exists estoque_lotes_delete_guard on public.estoque_lotes;
create policy estoque_lotes_delete_guard on public.estoque_lotes as restrictive for delete to authenticated using (false);

create or replace function public.erp_apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_status text;
  v_destination_type text;
  v_unit_cost numeric(18,6);
  v_available numeric(18,6);
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.' using errcode = '42501';
  end if;
  if new.empresa_id is distinct from v_empresa then raise exception 'TENANT_MOVEMENT_MISMATCH'; end if;
  if new.quantidade is null or new.quantidade <= 0 or new.quantidade::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'MOVEMENT_QUANTITY_INVALID' using errcode = '22023';
  end if;
  if not (
    public.erp_is_master()
    or exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = v_empresa
         and u.ativo = true
         and u.deleted_at is null
    )
  ) then
    raise exception 'Perfil ERP ativo não localizado na empresa atual.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque', 'movimentar')) then
    raise exception 'Sem permissão para movimentar estoque.' using errcode = '42501';
  end if;
  if new.tipo = 'ajuste_inventario' and new.endereco_origem_id is null and new.endereco_destino_id is null then
    raise exception 'AJUSTE_EXIGE_ORIGEM_OU_DESTINO';
  end if;

  select status, custo_unitario into v_status, v_unit_cost
    from public.estoque_lotes
   where id = new.lote_id and produto_id = new.produto_id and empresa_id = v_empresa
   for update;
  if not found then raise exception 'LOTE_OU_PRODUTO_NAO_ENCONTRADO_NO_TENANT'; end if;

  if new.tipo in ('requisicao_producao','transferencia') or (new.tipo='ajuste_inventario' and new.endereco_origem_id is not null) then
    if new.endereco_origem_id is null then raise exception 'ENDERECO_ORIGEM_OBRIGATORIO'; end if;
    select quantidade into v_available
      from public.estoque_saldos
     where empresa_id=v_empresa and produto_id=new.produto_id and lote_id=new.lote_id and endereco_id=new.endereco_origem_id
     for update;
    if not found or v_available < new.quantidade then raise exception 'SALDO_INSUFICIENTE_NO_ENDERECO_ORIGEM'; end if;
    if v_status <> 'liberado' and new.tipo = 'requisicao_producao' then raise exception 'LOTE_BLOQUEADO_OU_EM_QUARENTENA_NAO_PODE_SER_CONSUMIDO'; end if;
    update public.estoque_saldos set quantidade=quantidade-new.quantidade, updated_at=now()
     where empresa_id=v_empresa and produto_id=new.produto_id and lote_id=new.lote_id and endereco_id=new.endereco_origem_id;
  end if;

  if new.tipo in ('entrada_nf','retorno_producao','transferencia') or (new.tipo='ajuste_inventario' and new.endereco_destino_id is not null) then
    if new.endereco_destino_id is null then raise exception 'ENDERECO_DESTINO_OBRIGATORIO'; end if;
    select tipo into v_destination_type from public.estoque_enderecos where id=new.endereco_destino_id and empresa_id=v_empresa and ativo;
    if not found then raise exception 'ENDERECO_DESTINO_INVALIDO'; end if;
    if v_status <> 'liberado' and new.endereco_destino_id is not null and v_destination_type <> 'quarentena' then
      raise exception 'BLOCKED_LOT_DESTINATION_MUST_BE_QUARANTINE' using errcode = '42501';
    end if;
    insert into public.estoque_saldos(empresa_id,produto_id,lote_id,endereco_id,quantidade,custo_medio,updated_at)
    values(v_empresa,new.produto_id,new.lote_id,new.endereco_destino_id,new.quantidade,coalesce(v_unit_cost,0),now())
    on conflict (empresa_id,produto_id,lote_id,endereco_id)
    do update set quantidade=public.estoque_saldos.quantidade+excluded.quantidade, updated_at=now();
  end if;
  return new;
end;
$$;

create or replace function public.erp_quality_quarantine_lot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_quarantine_id uuid;
  v_rnc_code text;
begin
  if new.resultado <> 'reprovado' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.resultado = 'reprovado' then
    return new;
  end if;
  if auth.uid() is null or new.empresa_id is distinct from public.erp_current_empresa_id() then
    raise exception 'Sessão/empresa inválida para quarentena de lote.' using errcode = '42501';
  end if;
  if not (
    public.erp_is_master()
    or exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = new.empresa_id
         and u.ativo = true
         and u.deleted_at is null
    )
  ) then
    raise exception 'Perfil ERP ativo não localizado na empresa atual.' using errcode = '42501';
  end if;
  if not (
    public.erp_is_master()
    or public.erp_has_permission('qualidade', 'criar')
    or public.erp_has_permission('qualidade', 'editar')
  ) then
    raise exception 'Sem permissão para reter lote por Qualidade.' using errcode = '42501';
  end if;

  update public.estoque_lotes
     set status = 'bloqueado'
   where id = new.lote_id and empresa_id = new.empresa_id;

  select id into v_quarantine_id
    from public.estoque_enderecos
   where empresa_id = new.empresa_id and tipo = 'quarentena' and ativo
   order by codigo limit 1;

  if v_quarantine_id is null then
    raise exception 'QUARENTENA_ENDERECO_NAO_CONFIGURADO: cadastre um endereço ativo do tipo quarentena antes de reprovar lotes';
  end if;

  update public.estoque_saldos
     set endereco_id = v_quarantine_id, updated_at = now()
   where lote_id = new.lote_id and empresa_id = new.empresa_id;

  v_rnc_code := 'RNC-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  insert into public.qualidade_rnc_capa
    (empresa_id, codigo, lote_id, inspecao_id, origem, descricao, status)
  values
    (new.empresa_id, v_rnc_code, new.lote_id, new.id, 'interna',
     coalesce(nullif(new.observacoes, ''), 'Lote reprovado em inspeção de qualidade.'), 'aberto');
  return new;
end;
$$;

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
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_inspecao_id uuid;
  v_lote_empresa uuid;
  v_produto_lote uuid;
  v_medicoes jsonb := p_medicoes;
  v_resultado text := p_resultado;
  v_observacoes text := nullif(btrim(p_observacoes), '');
  v_spec_ok boolean := false;
  v_medicao jsonb;
  v_parametro jsonb;
  v_tipo_criterio text;
  v_especificacao_id uuid;
  v_codigo_criterio text;
  v_nominal numeric;
  v_tol_sup numeric;
  v_tol_inf numeric;
  v_valor numeric;
  v_medicao_invalida boolean := false;
begin
  if v_user_id is null or v_empresa_id is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.erp_usuarios u
     where u.auth_user_id = v_user_id
       and u.empresa_id = v_empresa_id
       and u.ativo = true
       and u.deleted_at is null
  ) then
    raise exception 'Perfil ERP ativo não localizado na empresa atual.' using errcode = '42501';
  end if;

  if not (
    public.erp_has_permission('qualidade', 'ver')
    and public.erp_has_permission('qualidade', 'criar')
  ) then
    raise exception 'Sem permissão para consultar e registrar inspeções da Qualidade.' using errcode = '42501';
  end if;

  if p_tipo is null
    or p_resultado is null
    or p_tipo not in ('recebimento', 'processo', 'produto_final')
    or p_resultado not in ('aprovado', 'reprovado', 'aprovado_com_restricao')
    or p_produto_id is null
    or p_lote_id is null
    or p_quantidade_total is null
    or p_tamanho_amostra is null
    or p_quantidade_total <= 0
    or p_tamanho_amostra <= 0
    or p_tamanho_amostra > p_quantidade_total
    or p_quantidade_total::text in ('NaN', 'Infinity', '-Infinity')
    or p_medicoes is null
    or jsonb_typeof(p_medicoes) <> 'array'
    or jsonb_array_length(p_medicoes) = 0 then
    raise exception 'Dados de inspeção inválidos.' using errcode = '22023';
  end if;

  select l.empresa_id, l.produto_id
    into v_lote_empresa, v_produto_lote
    from public.estoque_lotes l
   where l.id = p_lote_id
   for update;

  if not found or v_lote_empresa is distinct from v_empresa_id or v_produto_lote is distinct from p_produto_id then
    raise exception 'Lote não encontrado na empresa ativa ou produto incompatível.' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.engenharia_produtos p
     where p.id = p_produto_id
       and p.empresa_id = v_empresa_id
       and p.ativo = true
  ) then
    raise exception 'Produto não encontrado ou inativo.' using errcode = '22023';
  end if;

  select exists (
    select 1
      from public.qualidade_especificacoes s
     where s.empresa_id = v_empresa_id
       and s.produto_id = p_produto_id
       and s.status = 'ativa'
       and s.vigente_desde <= current_date
       and (s.vigente_ate is null or s.vigente_ate >= current_date)
       and exists (
         select 1
           from jsonb_array_elements(v_medicoes) m
          where nullif(m->>'especificacao_id', '')::uuid = s.id
       )
  ) into v_spec_ok;

  -- Recompute acceptance on the server from the current approved specification.
  -- Client-supplied "status: pass" and tolerance values are never authoritative.
  for v_medicao in
    select value from jsonb_array_elements(v_medicoes)
  loop
    v_especificacao_id := nullif(v_medicao->>'especificacao_id', '')::uuid;
    v_codigo_criterio := nullif(v_medicao->>'criterio_codigo', '');
    v_parametro := null;

    if v_especificacao_id is not null and v_codigo_criterio is not null then
      select p.parametro
        into v_parametro
        from public.qualidade_especificacoes s
        cross join lateral jsonb_array_elements(s.parametros) as p(parametro)
       where s.id = v_especificacao_id
         and s.empresa_id = v_empresa_id
         and s.produto_id = p_produto_id
         and s.status = 'ativa'
         and s.vigente_desde <= current_date
         and (s.vigente_ate is null or s.vigente_ate >= current_date)
         and p.parametro->>'codigo' = v_codigo_criterio
       limit 1;
    end if;

    if v_parametro is null then
      v_medicao_invalida := true;
      continue;
    end if;

    v_tipo_criterio := coalesce(v_parametro->>'tipo', 'numerico');

    if v_tipo_criterio = 'numerico' then
      if nullif(v_parametro->>'nominal', '') is null
        or nullif(v_parametro->>'tolerancia_superior', '') is null
        or nullif(v_parametro->>'tolerancia_inferior', '') is null
        or nullif(v_medicao->>'valor_medido', '') is null
        or nullif(v_medicao->>'valor_nominal', '') is null
        or nullif(v_medicao->>'tolerancia_superior', '') is null
        or nullif(v_medicao->>'tolerancia_inferior', '') is null then
        v_medicao_invalida := true;
        continue;
      end if;

      v_nominal := (v_parametro->>'nominal')::numeric;
      v_tol_sup := (v_parametro->>'tolerancia_superior')::numeric;
      v_tol_inf := (v_parametro->>'tolerancia_inferior')::numeric;
      v_valor := (v_medicao->>'valor_medido')::numeric;

      if v_tol_sup < 0 or v_tol_inf < 0
        or (v_medicao->>'valor_nominal')::numeric <> v_nominal
        or (v_medicao->>'tolerancia_superior')::numeric <> v_tol_sup
        or (v_medicao->>'tolerancia_inferior')::numeric <> v_tol_inf
        or v_valor < v_nominal - v_tol_inf
        or v_valor > v_nominal + v_tol_sup then
        v_medicao_invalida := true;
      end if;
    elsif v_tipo_criterio = 'certificado' then
      if nullif(btrim(v_medicao->>'numero_certificado'), '') is null
        or coalesce(v_medicao->>'conclusao_certificado', '') <> 'conforme' then
        v_medicao_invalida := true;
      end if;
    elsif nullif(btrim(v_medicao->>'evidencia_observada'), '') is null then
      v_medicao_invalida := true;
    end if;
  end loop;

  if v_medicao_invalida then
    v_resultado := 'reprovado';
    v_observacoes := left(concat_ws(
      ' ',
      'Bloqueio automático: medição/evidência não atende ao critério técnico vigente.',
      v_observacoes
    ), 4000);
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_medicoes) m
     where coalesce(m->>'status', '') = 'fail'
  ) then
    v_resultado := 'reprovado';
  end if;

  -- Without an active, current, product-specific specification linked to the
  -- measurements, no approval decision is allowed: retain the lot and create RNC.
  if not v_spec_ok then
    v_resultado := 'reprovado';
    v_observacoes := left(concat_ws(
      ' ',
      'Bloqueio automático: especificação técnica ativa e vigente ausente ou não vinculada.',
      v_observacoes
    ), 4000);
  end if;

  insert into public.qualidade_inspecoes (
    empresa_id, tipo, produto_id, lote_id, quantidade_total,
    tamanho_amostra, medicoes, resultado, inspetor_id, observacoes
  ) values (
    v_empresa_id, p_tipo, p_produto_id, p_lote_id, p_quantidade_total,
    p_tamanho_amostra, v_medicoes, v_resultado, v_user_id, v_observacoes
  ) returning id into v_inspecao_id;

  if v_resultado = 'reprovado' then
    update public.estoque_lotes
       set status = 'bloqueado'
     where id = p_lote_id
       and empresa_id = v_empresa_id;

    update public.erp_estoque_lotes
       set localizacao = 'Quarentena',
           status_inspecao = 'REPROVADO'
     where id = p_lote_id
       and empresa_id = v_empresa_id;

    if exists (
      select 1 from public.erp_estoque_lotes e
       where e.id = p_lote_id and e.empresa_id = v_empresa_id
    ) and not exists (
      select 1 from public.erp_quarentenas_lotes q
       where q.lote_id = p_lote_id
         and q.empresa_id = v_empresa_id
         and q.status = 'RETIDO'
    ) then
      insert into public.erp_quarentenas_lotes (
        empresa_id, lote_id, motivo, status, criado_por
      ) values (
        v_empresa_id, p_lote_id,
        left('Inspeção reprovada ' || v_inspecao_id::text || ': ' || coalesce(v_observacoes, 'medição fora da tolerância'), 500),
        'RETIDO', v_user_id
      );
    end if;
  end if;

  return v_inspecao_id;
end;
$function$;

revoke all on function public.erp_apply_stock_movement() from public, anon, authenticated;
revoke all on function public.erp_quality_quarantine_lot() from public, anon, authenticated;
revoke all on function public.erp_salvar_inspecao_lote(text, uuid, uuid, numeric, integer, jsonb, text, text) from public, anon;
grant execute on function public.erp_salvar_inspecao_lote(text, uuid, uuid, numeric, integer, jsonb, text, text) to authenticated;

commit;
