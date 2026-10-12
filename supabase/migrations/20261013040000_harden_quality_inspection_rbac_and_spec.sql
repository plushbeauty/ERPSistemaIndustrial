begin;

-- Enforce RBAC at the database boundary, not only in the Quality UI.
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

  if not public.erp_has_permission('qualidade', 'criar') then
    raise exception 'Sem permissão para registrar inspeções da Qualidade.' using errcode = '42501';
  end if;

  if p_tipo not in ('recebimento', 'processo', 'produto_final')
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

-- The older quarantine RPC is SECURITY DEFINER, so it must perform its own RBAC checks.
create or replace function public.erp_reter_lote(p_lote_id uuid, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_empresa_id uuid;
  v_rastreio_id uuid;
  v_quarentena_id uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  select l.empresa_id
    into v_empresa_id
    from public.erp_estoque_lotes l
   where l.id = p_lote_id
   for update;

  if v_empresa_id is null then
    raise exception 'Lote não encontrado.' using errcode = 'P0002';
  end if;

  if not (public.erp_is_master() or v_empresa_id = public.erp_current_empresa_id()) then
    raise exception 'Lote fora da empresa do usuário.' using errcode = '42501';
  end if;

  if not (
    public.erp_is_master()
    or public.erp_has_permission('qualidade', 'criar')
    or public.erp_has_permission('qualidade', 'editar')
    or public.erp_has_permission('estoque', 'editar')
    or public.erp_has_permission('estoque', 'movimentar')
  ) then
    raise exception 'Sem permissão para reter lote em quarentena.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_motivo, ''))) < 5 then
    raise exception 'Motivo da retenção é obrigatório.' using errcode = '22023';
  end if;

  select r.id
    into v_rastreio_id
    from public.erp_estoque_lotes_rastreabilidade r
   where r.empresa_id = v_empresa_id
     and r.lote_fornecedor = (
       select l.lote_fornecedor from public.erp_estoque_lotes l where l.id = p_lote_id and l.empresa_id = v_empresa_id
     )
   limit 1
   for update;

  update public.erp_estoque_lotes
     set status_inspecao = 'RETIDO'
   where id = p_lote_id
     and empresa_id = v_empresa_id;

  if v_rastreio_id is not null then
    update public.erp_estoque_lotes_rastreabilidade
       set status_qualidade = 'RETIDO'
     where id = v_rastreio_id
       and empresa_id = v_empresa_id;
  end if;

  insert into public.erp_quarentenas_lotes (
    empresa_id, lote_id, lote_rastreabilidade_id, motivo, criado_por
  ) values (
    v_empresa_id, p_lote_id, v_rastreio_id, btrim(p_motivo), v_user_id
  ) returning id into v_quarentena_id;

  return v_quarentena_id;
end;
$function$;

-- Restrictive policies layer RBAC over the existing tenant-isolation policies.
drop policy if exists qualidade_inspecoes_rbac_select on public.qualidade_inspecoes;
create policy qualidade_inspecoes_rbac_select
  on public.qualidade_inspecoes as restrictive for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));

drop policy if exists qualidade_inspecoes_rbac_insert on public.qualidade_inspecoes;
create policy qualidade_inspecoes_rbac_insert
  on public.qualidade_inspecoes as restrictive for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'criar'));

drop policy if exists qualidade_inspecoes_rbac_update on public.qualidade_inspecoes;
create policy qualidade_inspecoes_rbac_update
  on public.qualidade_inspecoes as restrictive for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'));

drop policy if exists qualidade_inspecoes_rbac_delete on public.qualidade_inspecoes;
create policy qualidade_inspecoes_rbac_delete
  on public.qualidade_inspecoes as restrictive for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'excluir'));

drop policy if exists estoque_lotes_rbac_update_guard on public.estoque_lotes;
create policy estoque_lotes_rbac_update_guard
  on public.estoque_lotes as restrictive for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (
      public.erp_has_permission('estoque', 'criar')
      or public.erp_has_permission('estoque', 'editar')
      or public.erp_has_permission('estoque', 'movimentar')
      or public.erp_has_permission('qualidade', 'criar')
      or public.erp_has_permission('qualidade', 'editar')
    )
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (
      public.erp_has_permission('estoque', 'criar')
      or public.erp_has_permission('estoque', 'editar')
      or public.erp_has_permission('estoque', 'movimentar')
      or public.erp_has_permission('qualidade', 'criar')
      or public.erp_has_permission('qualidade', 'editar')
    )
  );

drop policy if exists erp_estoque_lotes_rbac_update_guard on public.erp_estoque_lotes;
create policy erp_estoque_lotes_rbac_update_guard
  on public.erp_estoque_lotes as restrictive for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (
      public.erp_has_permission('estoque', 'criar')
      or public.erp_has_permission('estoque', 'editar')
      or public.erp_has_permission('estoque', 'movimentar')
      or public.erp_has_permission('qualidade', 'criar')
      or public.erp_has_permission('qualidade', 'editar')
    )
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and (
      public.erp_has_permission('estoque', 'criar')
      or public.erp_has_permission('estoque', 'editar')
      or public.erp_has_permission('estoque', 'movimentar')
      or public.erp_has_permission('qualidade', 'criar')
      or public.erp_has_permission('qualidade', 'editar')
    )
  );

drop policy if exists erp_quarentenas_lotes_rbac_select on public.erp_quarentenas_lotes;
create policy erp_quarentenas_lotes_rbac_select
  on public.erp_quarentenas_lotes as restrictive for select to authenticated
  using (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and (
      public.erp_has_permission('qualidade', 'ver')
      or public.erp_has_permission('estoque', 'ver')
      or public.erp_is_master()
    )
  );

drop policy if exists erp_quarentenas_lotes_rbac_insert on public.erp_quarentenas_lotes;
create policy erp_quarentenas_lotes_rbac_insert
  on public.erp_quarentenas_lotes as restrictive for insert to authenticated
  with check (
    (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
    and (
      public.erp_has_permission('qualidade', 'criar')
      or public.erp_has_permission('qualidade', 'editar')
      or public.erp_has_permission('estoque', 'criar')
      or public.erp_has_permission('estoque', 'editar')
      or public.erp_has_permission('estoque', 'movimentar')
      or public.erp_is_master()
    )
  );

revoke all on function public.erp_salvar_inspecao_lote(text, uuid, uuid, numeric, integer, jsonb, text, text) from public, anon;
grant execute on function public.erp_salvar_inspecao_lote(text, uuid, uuid, numeric, integer, jsonb, text, text) to authenticated;

revoke all on function public.erp_reter_lote(uuid, text) from public, anon;
grant execute on function public.erp_reter_lote(uuid, text) to authenticated;

commit;
