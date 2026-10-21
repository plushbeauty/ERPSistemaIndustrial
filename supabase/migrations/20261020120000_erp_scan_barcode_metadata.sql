-- SYSNQRA ERP & SGQ INDUSTRIAL
-- Pesquisa rápida autenticada por código de barras, lote, produto ou RPNC.
-- Isolamento por empresa atual; respeita grants e RLS das tabelas consultadas.
begin;

create or replace function public.erp_scan_barcode_metadata(barcode_string varchar)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_code text := upper(trim(coalesce(barcode_string, '')));
  v_empresa_id uuid;
  v_result jsonb;
  v_lot record;
begin
  if auth.uid() is null then
    raise exception 'AUTH_SESSION_REQUIRED' using errcode = '28000';
  end if;

  if v_code = '' or length(v_code) > 160 then
    raise exception 'BARCODE_INVALID' using errcode = '22023';
  end if;

  v_empresa_id := public.erp_current_empresa_id();
  if v_empresa_id is null then
    raise exception 'TENANT_REQUIRED' using errcode = '42501';
  end if;

  -- RNC/RPNC por número. A tabela usa criado_em (contrato confirmado na RPC de criação).
  select jsonb_build_object(
    'id_registro', r.id::text,
    'codigo_varrido', v_code,
    'tipo_modulo', 'QUALIDADE',
    'titulo_principal', 'RNC/RPNC LOCALIZADA: ' || r.numero_rpnc,
    'subtitulo_detalhe', concat_ws(' | ',
      nullif('Origem: ' || coalesce(r.origem, ''), 'Origem: '),
      nullif('Lote: ' || coalesce(r.lote_producao, ''), 'Lote: '),
      nullif('Status: ' || coalesce(r.status, ''), 'Status: ')
    ),
    'status_operacional', case
      when upper(coalesce(r.status, '')) in ('ENCERRADA', 'FECHADA', 'CONCLUIDA', 'CONCLUÍDA') then 'Offline'
      else 'Bloqueado'
    end,
    'arvore_rastreabilidade', jsonb_build_array(
      jsonb_build_object(
        'id', r.id::text,
        'codigo_lote', coalesce(nullif(r.lote_producao, ''), r.numero_rpnc),
        'tipo_componente', 'RNC/RPNC',
        'status_inspecao', 'REJEITADO',
        'quantidade', greatest(coalesce(r.quantidade_segregada, 1)::numeric, 0)
      )
    )
  )
  into v_result
  from public.erp_rpnc r
  where r.empresa_id = v_empresa_id
    and upper(trim(r.numero_rpnc)) = v_code
  order by r.criado_em desc
  limit 1;

  if v_result is not null then
    return v_result;
  end if;

  -- Lote interno/fornecedor. erp_estoque_lotes usa created_at e quantidade_disponivel.
  select l.id, l.lote_interno, l.lote_fornecedor, l.produto_id,
         l.quantidade_disponivel, l.status_inspecao
    into v_lot
  from public.erp_estoque_lotes l
  where l.empresa_id = v_empresa_id
    and (upper(trim(l.lote_interno)) = v_code
      or upper(trim(coalesce(l.lote_fornecedor, ''))) = v_code)
  order by l.created_at desc
  limit 1;

  if v_lot.id is not null then
    select jsonb_build_object(
      'id_registro', p.id::text,
      'codigo_varrido', v_code,
      'tipo_modulo', 'SUPRIMENTOS',
      'titulo_principal', 'LOTE LOCALIZADO: ' || v_lot.lote_interno,
      'subtitulo_detalhe', concat_ws(' | ',
        'Produto: ' || p.codigo || ' — ' || p.nome,
        'Saldo disponível: ' || v_lot.quantidade_disponivel::text,
        'Inspeção: ' || coalesce(v_lot.status_inspecao, 'AGUARDANDO')
      ),
      'status_operacional', case
        when upper(coalesce(v_lot.status_inspecao, '')) in ('REPROVADO', 'REJEITADO', 'QUARENTENA', 'SUCATA', 'BLOQUEADO') then 'Bloqueado'
        when upper(coalesce(v_lot.status_inspecao, '')) in ('APROVADO', 'LIBERADO') then 'Online'
        else 'Em Setup'
      end,
      'arvore_rastreabilidade', jsonb_build_array(
        jsonb_build_object(
          'id', v_lot.id::text,
          'codigo_lote', v_lot.lote_interno,
          'tipo_componente', 'Lote de estoque',
          'status_inspecao', case
            when upper(coalesce(v_lot.status_inspecao, '')) in ('APROVADO', 'LIBERADO') then 'APROVADO'
            when upper(coalesce(v_lot.status_inspecao, '')) in ('REPROVADO', 'REJEITADO', 'QUARENTENA', 'SUCATA', 'BLOQUEADO') then 'REJEITADO'
            else 'EM_SETUP'
          end,
          'quantidade', coalesce(v_lot.quantidade_disponivel, 0)::numeric
        ),
        jsonb_build_object(
          'id', p.id::text,
          'codigo_lote', p.codigo,
          'tipo_componente', 'Produto',
          'status_inspecao', 'EM_SETUP',
          'quantidade', 1
        )
      )
    )
    into v_result
    from public.erp_produtos p
    where p.id = v_lot.produto_id
      and p.empresa_id = v_empresa_id
    limit 1;

    if v_result is not null then
      return v_result;
    end if;
  end if;

  -- Produto por código interno ou código de barras.
  select jsonb_build_object(
    'id_registro', p.id::text,
    'codigo_varrido', v_code,
    'tipo_modulo', 'PCP',
    'titulo_principal', p.nome,
    'subtitulo_detalhe', 'Código interno: ' || p.codigo,
    'status_operacional', case when coalesce(p.ativo, false) then 'Online' else 'Offline' end,
    'arvore_rastreabilidade', jsonb_build_array(
      jsonb_build_object(
        'id', p.id::text,
        'codigo_lote', p.codigo,
        'tipo_componente', 'Produto cadastrado',
        'status_inspecao', 'EM_SETUP',
        'quantidade', 1
      )
    )
  )
  into v_result
  from public.erp_produtos p
  where p.empresa_id = v_empresa_id
    and (
      upper(trim(p.codigo)) = v_code
      or upper(trim(coalesce(p.codigo_barras, ''))) = v_code
    )
  order by p.created_at desc nulls last
  limit 1;

  return v_result;
end;
$function$;

revoke all on function public.erp_scan_barcode_metadata(varchar) from public;
revoke all on function public.erp_scan_barcode_metadata(varchar) from anon;
grant execute on function public.erp_scan_barcode_metadata(varchar) to authenticated;

commit;
