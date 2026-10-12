begin;

-- Moving every balance row to the quarantine address with a simple UPDATE can
-- violate the unique (empresa, produto, lote, endereco) key when the same lot
-- is split across multiple addresses. Consolidate quantities and weighted cost
-- into the quarantine address first, then remove the old address rows.
create or replace function public.erp_quality_quarantine_lot()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
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

  -- Move only balances outside quarantine; the ON CONFLICT branch combines
  -- quantities and weighted-average cost with any balance already in quarantine.
  insert into public.estoque_saldos
    (empresa_id, produto_id, lote_id, endereco_id, quantidade, custo_medio, updated_at)
  select
    s.empresa_id,
    s.produto_id,
    s.lote_id,
    v_quarantine_id,
    sum(s.quantidade),
    case when sum(s.quantidade) <> 0
      then sum(s.quantidade * s.custo_medio) / sum(s.quantidade)
      else max(s.custo_medio)
    end,
    now()
  from public.estoque_saldos s
  where s.empresa_id = new.empresa_id
    and s.lote_id = new.lote_id
    and s.endereco_id <> v_quarantine_id
  group by s.empresa_id, s.produto_id, s.lote_id
  having count(*) > 0
  on conflict (empresa_id, produto_id, lote_id, endereco_id)
  do update set
    quantidade = public.estoque_saldos.quantidade + excluded.quantidade,
    custo_medio = case
      when public.estoque_saldos.quantidade + excluded.quantidade <> 0
      then (
        public.estoque_saldos.quantidade * public.estoque_saldos.custo_medio
        + excluded.quantidade * excluded.custo_medio
      ) / (public.estoque_saldos.quantidade + excluded.quantidade)
      else excluded.custo_medio
    end,
    updated_at = now();

  delete from public.estoque_saldos
   where empresa_id = new.empresa_id
     and lote_id = new.lote_id
     and endereco_id <> v_quarantine_id;

  v_rnc_code := 'RNC-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  insert into public.qualidade_rnc_capa
    (empresa_id, codigo, lote_id, inspecao_id, origem, descricao, status)
  values
    (new.empresa_id, v_rnc_code, new.lote_id, new.id, 'interna',
     coalesce(nullif(new.observacoes, ''), 'Lote reprovado em inspeção de qualidade.'), 'aberto');
  return new;
end;
$function$;

revoke all on function public.erp_quality_quarantine_lot() from public, anon, authenticated;

commit;
