-- Formal disposition workflow for held lots. Retained stock stays blocked until explicit Quality release.
alter table public.erp_quarentenas_lotes
  add column if not exists decisao_motivo text null,
  add column if not exists decisao_por uuid null references auth.users(id) on delete set null,
  add column if not exists decisao_em timestamptz null;

alter table public.erp_quarentenas_lotes
  add column if not exists quantidade_retirada numeric not null default 0
    check (quantidade_retirada >= 0);

create or replace function public.erp_qualidade_decidir_quarentena(
  p_quarentena_id uuid,
  p_decisao text,
  p_motivo text
)
returns public.erp_quarentenas_lotes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_quarentena public.erp_quarentenas_lotes;
  v_lote public.erp_estoque_lotes%rowtype;
  v_trace public.erp_estoque_lotes_rastreabilidade%rowtype;
  v_localizacao_id uuid;
  v_quantidade_retirada numeric := 0;
  v_quantidade_remover numeric := 0;
  v_saldo numeric;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.';
  end if;
  if not public.erp_is_master() and not public.erp_has_permission('qualidade', 'aprovar') then
    raise exception 'Sem permissão para decidir quarentena; solicite aprovação formal da Qualidade.';
  end if;
  if p_decisao not in ('LIBERADO','SUCATA','RETRABALHO') then
    raise exception 'Decisão de quarentena inválida.';
  end if;
  if length(trim(coalesce(p_motivo,''))) < 5 then
    raise exception 'Informe a justificativa da decisão com pelo menos 5 caracteres.';
  end if;

  select q.* into v_quarentena
  from public.erp_quarentenas_lotes q
  where q.id = p_quarentena_id and q.empresa_id = v_empresa
  for update;
  if not found then raise exception 'Quarentena não encontrada na empresa atual.'; end if;
  if v_quarentena.status in ('LIBERADO','SUCATA') then
    raise exception 'Esta quarentena já possui uma decisão final.';
  end if;
  if v_quarentena.status not in ('RETIDO','RETRABALHO') then
    raise exception 'Somente lotes retidos ou em retrabalho podem receber decisão.';
  end if;
  if v_quarentena.status = 'RETRABALHO' and p_decisao = 'RETRABALHO' then
    raise exception 'O lote já está em retrabalho; escolha liberação após verificação ou sucata.';
  end if;

  select * into v_lote
  from public.erp_estoque_lotes
  where id = v_quarentena.lote_id and empresa_id = v_empresa
  for update;
  if not found then raise exception 'Lote de estoque vinculado à quarentena não foi encontrado.'; end if;

  if p_decisao = 'LIBERADO' and exists (
    select 1
    from public.erp_rpnc r
    where r.empresa_id = v_empresa
      and lower(coalesce(r.sgq_vinculo_tipo, '')) = 'lote'
      and r.sgq_vinculo_id = v_quarentena.lote_id
      and lower(coalesce(r.status, '')) <> 'encerrada'
  ) then
    raise exception 'Liberação bloqueada: encerre a RPNC vinculada ao lote após validar as ações corretivas.';
  end if;

  v_quantidade_retirada := coalesce(v_quarentena.quantidade_retirada, 0);
  if v_quarentena.lote_rastreabilidade_id is not null then
    select * into v_trace
    from public.erp_estoque_lotes_rastreabilidade
    where id = v_quarentena.lote_rastreabilidade_id and empresa_id = v_empresa
    for update;
    if not found then raise exception 'Rastreabilidade vinculada à quarentena não foi encontrada.'; end if;
    if abs(coalesce(v_trace.quantidade_disponivel, 0) - coalesce(v_lote.quantidade_disponivel, 0)) > 0.0001 then
      raise exception 'Saldo do lote diverge do saldo de rastreabilidade; reconcilie antes da decisão.';
    end if;
  end if;

  if p_decisao = 'LIBERADO' then
    if v_quantidade_retirada > 0 then
    if coalesce(v_lote.quantidade_disponivel, 0) > 0 then
      raise exception 'O lote já possui saldo disponível apesar de haver quantidade retida registrada; reconcilie antes de liberar.';
    end if;
    if v_quarentena.lote_rastreabilidade_id is not null and coalesce(v_trace.quantidade_disponivel, 0) > 0 then
      raise exception 'A rastreabilidade já possui saldo disponível; reconcilie antes de liberar.';
    end if;

    select l.id into v_localizacao_id
    from public.erp_estoque_localizacoes l
    where l.empresa_id = v_empresa and l.ativo = true
      and (
        (l.codigo || ' · ' || l.nome) = v_lote.localizacao
        or l.nome = v_lote.localizacao
        or l.codigo = v_lote.localizacao
      )
    order by case when (l.codigo || ' · ' || l.nome) = v_lote.localizacao then 0 else 1 end, l.id
    limit 1
    for update;
    if v_localizacao_id is null then
      raise exception 'Endereço ativo do lote não foi localizado; corrija o WMS antes de liberar.';
    end if;

    perform public.fn_incrementar_saldo_almoxarifado(v_empresa, v_lote.produto_id, v_quantidade_retirada);
    insert into public.erp_estoque_movimentos (
      empresa_id, produto_id, tipo, quantidade, origem, documento, ordem_producao_id,
      localizacao_destino_id, observacao
    ) values (
      v_empresa, v_lote.produto_id, 'entrada', v_quantidade_retirada, 'qualidade',
      v_lote.lote_interno, null, v_localizacao_id,
      'Liberação formal da quarentena ' || v_quarentena.id::text || ': ' || btrim(p_motivo)
    );

    update public.erp_estoque_lotes
    set status_inspecao = 'APROVADO',
        quantidade_disponivel = coalesce(quantidade_disponivel, 0) + v_quantidade_retirada
    where id = v_lote.id and empresa_id = v_empresa;

    if v_quarentena.lote_rastreabilidade_id is not null then
      update public.erp_estoque_lotes_rastreabilidade
      set status_qualidade = 'APROVADO',
          quantidade_disponivel = coalesce(quantidade_disponivel, 0) + v_quantidade_retirada
      where id = v_quarentena.lote_rastreabilidade_id and empresa_id = v_empresa;
    end if;
    else
      update public.erp_estoque_lotes
      set status_inspecao = 'APROVADO'
      where id = v_lote.id and empresa_id = v_empresa;
      if v_quarentena.lote_rastreabilidade_id is not null then
        update public.erp_estoque_lotes_rastreabilidade
        set status_qualidade = 'APROVADO'
        where id = v_quarentena.lote_rastreabilidade_id and empresa_id = v_empresa;
      end if;
    end if;
  else
    if p_decisao in ('SUCATA','RETRABALHO') and coalesce(v_lote.quantidade_disponivel, 0) > 0 then
      if v_quantidade_retirada > 0 then
        raise exception 'O lote possui saldo ativo além da quantidade retida registrada; reconcilie antes de concluir.';
      end if;
      v_quantidade_remover := coalesce(v_lote.quantidade_disponivel, 0);

      select l.id into v_localizacao_id
      from public.erp_estoque_localizacoes l
      where l.empresa_id = v_empresa and l.ativo = true
        and (
          (l.codigo || ' · ' || l.nome) = v_lote.localizacao
          or l.nome = v_lote.localizacao
          or l.codigo = v_lote.localizacao
        )
      order by case when (l.codigo || ' · ' || l.nome) = v_lote.localizacao then 0 else 1 end, l.id
      limit 1
      for update;
      if v_localizacao_id is null then
        raise exception 'Endereço ativo do lote não foi localizado; corrija o WMS antes de concluir.';
      end if;

      select saldo_fisico into v_saldo
      from public.erp_produto_estoque
      where empresa_id = v_empresa and produto_id = v_lote.produto_id
      for update;
      if found then
        if coalesce(v_saldo, 0) + 0.0001 < v_quantidade_remover then
          raise exception 'Saldo WMS insuficiente para concluir a disposição do lote.';
        end if;
        update public.erp_produto_estoque
        set saldo_fisico = greatest(0, saldo_fisico - v_quantidade_remover), updated_at = now()
        where empresa_id = v_empresa and produto_id = v_lote.produto_id;
      end if;

      insert into public.erp_estoque_movimentos (
        empresa_id, produto_id, tipo, quantidade, origem, documento, ordem_producao_id,
        localizacao_origem_id, observacao
      ) values (
        v_empresa, v_lote.produto_id, 'saida', v_quantidade_remover, 'qualidade',
        v_lote.lote_interno, null, v_localizacao_id,
        'Retirada de saldo legado para decisão de quarentena ' || v_quarentena.id::text || ': ' || btrim(p_motivo)
      );

      update public.erp_quarentenas_lotes
      set quantidade_retirada = v_quantidade_remover
      where id = v_quarentena.id and empresa_id = v_empresa;
      v_quantidade_retirada := v_quantidade_remover;
    end if;

    update public.erp_estoque_lotes
    set status_inspecao = 'RETIDO', quantidade_disponivel = 0
    where id = v_lote.id and empresa_id = v_empresa;
    if v_quarentena.lote_rastreabilidade_id is not null then
      update public.erp_estoque_lotes_rastreabilidade
      set status_qualidade = 'RETIDO', quantidade_disponivel = 0
      where id = v_quarentena.lote_rastreabilidade_id and empresa_id = v_empresa;
    end if;
  end if;

  update public.erp_quarentenas_lotes
  set status = p_decisao,
      decisao_motivo = trim(p_motivo),
      decisao_por = auth.uid(),
      decisao_em = now(),
      liberado_por = case when p_decisao = 'LIBERADO' then auth.uid() else liberado_por end,
      liberado_em = case when p_decisao = 'LIBERADO' then now() else liberado_em end,
      quantidade_retirada = greatest(coalesce(quantidade_retirada, 0), v_quantidade_retirada)
  where id = v_quarentena.id and empresa_id = v_empresa
  returning * into v_quarentena;

  return v_quarentena;
end;
$$;

revoke all on function public.erp_qualidade_decidir_quarentena(uuid,text,text) from public, anon;
grant execute on function public.erp_qualidade_decidir_quarentena(uuid,text,text) to authenticated;
