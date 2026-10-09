-- Corrective hardening for industrial costing and quarantine idempotency.
begin;

create or replace function public.erp_quality_quarantine_lot()
returns trigger
language plpgsql
security invoker
set search_path = public
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

create or replace function public.erp_registrar_custo_medio_nfe(
  p_produto_id uuid,
  p_lote_id uuid,
  p_endereco_id uuid,
  p_quantidade numeric,
  p_valor_liquido_unitario numeric,
  p_documento_origem text
) returns numeric
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_saldo numeric(18,6);
  v_custo numeric(18,6);
  v_novo_custo numeric(18,6);
begin
  if p_quantidade <= 0 or p_valor_liquido_unitario < 0 then
    raise exception 'QUANTIDADE_OU_CUSTO_INVALIDO';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_empresa_id::text || ':' || p_produto_id::text, 0));

  if not exists (
    select 1 from public.estoque_lotes
    where id = p_lote_id and produto_id = p_produto_id and empresa_id = v_empresa_id
  ) then
    raise exception 'LOTE_NAO_ENCONTRADO_NO_TENANT';
  end if;

  select coalesce(sum(quantidade), 0),
         case when coalesce(sum(quantidade), 0) = 0 then 0
              else sum(quantidade * custo_medio) / sum(quantidade) end
    into v_saldo, v_custo
    from public.estoque_saldos
   where produto_id = p_produto_id and empresa_id = v_empresa_id;

  v_novo_custo := ((v_saldo * v_custo) + (p_quantidade * p_valor_liquido_unitario))
                  / nullif(v_saldo + p_quantidade, 0);
  v_novo_custo := coalesce(v_novo_custo, 0);

  insert into public.estoque_saldos
    (empresa_id, produto_id, lote_id, endereco_id, quantidade, custo_medio, updated_at)
  values (v_empresa_id, p_produto_id, p_lote_id, p_endereco_id, p_quantidade, v_novo_custo, now())
  on conflict (empresa_id, produto_id, lote_id, endereco_id)
  do update set quantidade = public.estoque_saldos.quantidade + excluded.quantidade,
                custo_medio = excluded.custo_medio,
                updated_at = now();

  update public.estoque_lotes
     set custo_unitario = p_valor_liquido_unitario
   where id = p_lote_id and empresa_id = v_empresa_id;

  insert into public.fiscal_historico_custos
    (empresa_id, produto_id, lote_id, documento_origem, quantidade, valor_liquido_unitario,
     saldo_anterior, custo_medio_anterior, custo_medio_novo)
  values (v_empresa_id, p_produto_id, p_lote_id, p_documento_origem, p_quantidade,
          p_valor_liquido_unitario, v_saldo, v_custo, v_novo_custo);

  return v_novo_custo;
end;
$$;

commit;
