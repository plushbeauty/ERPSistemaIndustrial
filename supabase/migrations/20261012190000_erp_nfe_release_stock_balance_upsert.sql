-- Keep the canonical product stock balance in sync when an authorized
-- warehouse release is physically concluded. The table may have no row yet
-- for a product, so UPDATE-only silently skipped the secondary stock balance.
begin;

create or replace function private.erp_concluir_liberacao_nf(p_liberacao_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_header public.erp_liberacoes_nf%rowtype;
  v_item record;
  v_lot public.erp_estoque_lotes%rowtype;
  v_user uuid;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada.' using errcode='42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('fiscal','emitir') or public.erp_has_permission('estoque','movimentar')) then
    raise exception 'Sem permissão para concluir a liberação fiscal.' using errcode='42501';
  end if;
  select * into v_header
  from public.erp_liberacoes_nf
  where id=p_liberacao_id and empresa_id=v_empresa
  for update;
  if not found or v_header.status<>'VINCULADA_NFE' or v_header.documento_fiscal_id is null then
    raise exception 'Somente uma liberação vinculada à NF-e pode ser concluída.' using errcode='55000';
  end if;
  if not exists (
    select 1 from public.erp_documentos_fiscais d
    where d.id=v_header.documento_fiscal_id and d.empresa_id=v_empresa
      and lower(coalesce(d.status,'')) in ('autorizada','autorizado')
  ) then
    raise exception 'A baixa física exige NF-e com status autorizado persistido.' using errcode='55000';
  end if;

  for v_item in
    select i.produto_id,i.lote_id,sum(i.quantidade) as quantidade
    from public.erp_liberacoes_nf_itens i
    where i.liberacao_id=v_header.id and i.empresa_id=v_empresa
    group by i.produto_id,i.lote_id
    order by i.lote_id
  loop
    select * into v_lot
    from public.erp_estoque_lotes l
    where l.id=v_item.lote_id and l.empresa_id=v_empresa
    for update;
    if not found
       or coalesce(v_lot.quantidade_reservada,0)<v_item.quantidade
       or coalesce(v_lot.quantidade_disponivel,0)<v_item.quantidade then
      raise exception 'Saldo reservado/físico do lote não cobre a quantidade a faturar.' using errcode='55000';
    end if;

    update public.erp_estoque_lotes
    set quantidade_disponivel=quantidade_disponivel-v_item.quantidade,
        quantidade_reservada=quantidade_reservada-v_item.quantidade
    where id=v_item.lote_id and empresa_id=v_empresa;

    update public.erp_produtos
    set estoque_atual=greatest(coalesce(estoque_atual,0)-v_item.quantidade,0),
        updated_at=now()
    where id=v_item.produto_id and empresa_id=v_empresa and ativo=true;
    if not found then
      raise exception 'Produto não localizado para efetivar a baixa física.';
    end if;

    -- If the secondary balance row is missing, initialize it from the already
    -- decremented canonical product balance. If it exists, decrement once.
    insert into public.erp_produto_estoque(empresa_id,produto_id,saldo_fisico)
    select v_empresa,p.id,greatest(coalesce(p.estoque_atual,0),0)
    from public.erp_produtos p
    where p.id=v_item.produto_id and p.empresa_id=v_empresa and p.ativo=true
    on conflict (empresa_id,produto_id) do update
      set saldo_fisico=greatest(coalesce(public.erp_produto_estoque.saldo_fisico,0)-v_item.quantidade,0),
          updated_at=now();

    insert into public.erp_estoque_movimentos(
      empresa_id,produto_id,tipo,quantidade,origem,documento,observacao
    ) values (
      v_empresa,v_item.produto_id,'saida',v_item.quantidade,'LIBERACAO_NF',
      v_header.documento_fiscal_id::text,
      'Baixa após NF-e autorizada; liberação '||v_header.id::text||'; lote '||v_item.lote_id::text
    );
  end loop;

  select u.id into v_user
  from public.erp_usuarios u
  where u.auth_user_id=auth.uid()
    and (u.empresa_id=v_empresa or public.erp_is_master())
    and u.ativo=true and u.deleted_at is null
  limit 1;

  update public.erp_liberacoes_nf
  set status='CONCLUIDA',concluido_por=v_user,concluido_em=now(),updated_at=now()
  where id=v_header.id and empresa_id=v_empresa;

  insert into public.erp_logs_sistema(empresa_id,usuario_id,modulo,acao,entidade,entidade_id,dados)
  values(v_empresa,v_user,'Almoxarifado','LIBERACAO_NF_CONCLUIDA','erp_liberacoes_nf',v_header.id,
    jsonb_build_object('documento_fiscal_id',v_header.documento_fiscal_id,'baixa_estoque',true));
  return true;
end;
$function$;

commit;
