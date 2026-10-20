-- SYSNQRA ERP & SGQ INDUSTRIAL
-- Migration: consulta segura de metadados por código de barras / part number / RNC.
-- Esquema conferido nas migrations do repositório:
--   erp_produtos: empresa_id, codigo, nome, descricao_resumida, codigo_barras,
--                 referencia_interna, ativo, created_at.
--   erp_codigos: tabela de configuração de sequências (prefixo/separador/modo_numeracao),
--                não é uma tabela de itens/produtos escaneáveis; created_at/updated_at.
--   RNC operacional: erp_rpnc (não foi encontrada tabela erp_qualidade_rnc).
--   erp_rpnc utiliza empresa_id, data_ocorrencia e o schema-base created_at.
-- A leitura do RNC usa chaves JSON para tolerar variações de metadados sem referenciar
-- estaticamente colunas opcionais; empresa_id é sempre uma condição SQL obrigatória.

begin;

create or replace function public.erp_scan_barcode_metadata(p_codigo text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
  v_produto record;
  v_rnc jsonb;
  v_rnc_codigo text;
  v_rnc_status text;
  v_rnc_data text;
begin
  if auth.uid() is null or v_empresa_id is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.'
      using errcode = '42501';
  end if;

  if v_codigo = '' then
    raise exception 'Informe um código para consulta.'
      using errcode = '22023';
  end if;

  select
    p.id,
    p.codigo,
    p.nome,
    p.descricao_resumida,
    p.codigo_barras,
    p.referencia_interna,
    coalesce(to_jsonb(p)->>'created_at', to_jsonb(p)->>'criado_em')
  into v_produto
  from public.erp_produtos as p
  where p.empresa_id = v_empresa_id
    and p.ativo is true
    and (
      upper(coalesce(p.codigo_barras, '')) = v_codigo
      or upper(coalesce(p.codigo, '')) = v_codigo
      or upper(coalesce(p.referencia_interna, '')) = v_codigo
    )
  order by coalesce(to_jsonb(p)->>'created_at', to_jsonb(p)->>'criado_em') desc nulls last
  limit 1;

  if found then
    return jsonb_build_object(
      'tipo', 'produto',
      'id', v_produto.id,
      'codigo', v_produto.codigo,
      'nome', v_produto.nome,
      'descricao', v_produto.descricao_resumida,
      'codigo_barras', v_produto.codigo_barras,
      'referencia_interna', v_produto.referencia_interna,
      'data', v_produto.created_at
    );
  end if;

  select to_jsonb(r)
    into v_rnc
  from public.erp_rpnc as r
  where r.empresa_id = v_empresa_id
    and (
      upper(coalesce(to_jsonb(r)->>'codigo', '')) = v_codigo
      or upper(coalesce(to_jsonb(r)->>'numero_rpnc', '')) = v_codigo
      or upper(coalesce(to_jsonb(r)->>'numero_rnc', '')) = v_codigo
      or upper(coalesce(to_jsonb(r)->>'codigo_rnc', '')) = v_codigo
      or upper(coalesce(to_jsonb(r)->>'numero', '')) = v_codigo
    )
  limit 1;

  if v_rnc is not null then
    v_rnc_codigo := coalesce(
      v_rnc->>'codigo',
      v_rnc->>'numero_rpnc',
      v_rnc->>'numero_rnc',
      v_rnc->>'codigo_rnc',
      v_rnc->>'numero',
      v_rnc->>'id'
    );
    v_rnc_status := v_rnc->>'status';
    v_rnc_data := coalesce(
      v_rnc->>'created_at',
      v_rnc->>'criado_em',
      v_rnc->>'data_ocorrencia'
    );

    return jsonb_build_object(
      'tipo', 'rnc',
      'id', v_rnc->>'id',
      'codigo', v_rnc_codigo,
      'nome', coalesce(v_rnc->>'titulo', v_rnc->>'descricao', 'Registro de não conformidade'),
      'descricao', coalesce(v_rnc->>'descricao', v_rnc->>'problema', v_rnc->>'observacao'),
      'status', v_rnc_status,
      'data', v_rnc_data
    );
  end if;

  return jsonb_build_object(
    'tipo', 'nao_encontrado',
    'codigo', v_codigo,
    'mensagem', 'Código não localizado na empresa autenticada.'
  );
end;
$function$;

revoke all on function public.erp_scan_barcode_metadata(text) from public, anon;
grant execute on function public.erp_scan_barcode_metadata(text) to authenticated;

commit;
