-- Persist IBGE municipality code and declared payment method/value in fiscal draft RPC.
-- Harden NF-e draft persistence before it can be used as a release authorization signal.
-- Only the provider-backed emission path may persist an authorized state.
begin;
create or replace function public.erp_salvar_rascunho_nfe(
  p_documento_id uuid,
  p_documento jsonb,
  p_itens jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid;
  v_empresa_text text;
  v_sessao_empresa_id uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_empresa_id uuid;
  v_master boolean;
  v_documento public.erp_documentos_fiscais%rowtype;
  v_id uuid;
  v_item jsonb;
  v_produto_id uuid;
  v_produto_text text;
  v_item_numero integer;
  v_item_numero_numeric numeric;
  v_item_numeros integer[] := array[]::integer[];
  v_quantidade numeric;
  v_valor_unitario numeric;
  v_valor_desconto numeric;
  v_valor_total numeric;
  v_total_itens numeric := 0;
  v_total_produtos numeric;
  v_frete numeric;
  v_outras_despesas numeric;
  v_desconto_documento numeric;
  v_ipi numeric;
  v_icms_st numeric;
  v_total_documento numeric;
  v_total_liquido numeric;
  v_origem text;
begin
  if auth.uid() is null then
    raise exception 'Sessão de autenticação obrigatória' using errcode = '42501';
  end if;

  if p_documento is null or jsonb_typeof(p_documento) <> 'object' then
    raise exception 'Os dados do rascunho fiscal devem ser um objeto JSON' using errcode = '22023';
  end if;

  v_empresa_text := nullif(btrim(p_documento->>'empresa_id'), '');
  if v_empresa_text is null
     or v_empresa_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Empresa fiscal ausente ou com identificador inválido' using errcode = '22023';
  end if;
  v_empresa_id := v_empresa_text::uuid;

  select u.id, u.empresa_id
  into v_usuario_id, v_usuario_empresa_id
  from public.erp_usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo = true
    and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não localizado para esta sessão' using errcode = '42501';
  end if;

  v_master := public.erp_is_master();
  if v_master is true then
    if v_usuario_empresa_id is not null or v_sessao_empresa_id is not null then
      raise exception 'Perfil Master inconsistente com o contrato de empresa nula' using errcode = '42501';
    end if;
  elsif v_usuario_empresa_id is null
        or v_sessao_empresa_id is null
        or v_usuario_empresa_id is distinct from v_sessao_empresa_id then
    raise exception 'Usuário sem empresa ativa vinculada à sessão' using errcode = '42501';
  end if;

  if v_empresa_id is distinct from v_sessao_empresa_id
     and v_master is not true then
    raise exception 'Empresa não autorizada para esta sessão' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.erp_empresas e
    where e.id = v_empresa_id
      and e.ativo = true
  ) then
    raise exception 'Empresa fiscal inexistente ou inativa' using errcode = '42501';
  end if;

  if public.erp_has_permission('fiscal', 'emitir') is distinct from true then
    raise exception 'Usuário sem permissão fiscal para salvar rascunhos NF-e' using errcode = '42501';
  end if;

  if coalesce(p_documento->>'modelo', '55') <> '55'
     or coalesce(p_documento->>'status', 'Rascunho') <> 'Rascunho'
     or coalesce(p_documento->>'tipo', '') not in ('NF-e', 'NF-e Entrada') then
    raise exception 'Somente rascunhos fiscais de NF-e modelo 55 podem ser salvos' using errcode = '22023';
  end if;

  if coalesce(btrim(p_documento->>'natureza_operacao'), '') = ''
     or coalesce(btrim(p_documento->>'cfop'), '') !~ '^[0-9]{4}$'
     or coalesce(p_documento->>'ambiente', '') not in ('homologacao', 'producao')
     or nullif(p_documento->>'data_emissao', '') is null
     or coalesce(btrim(p_documento->>'destinatario_nome'), '') = ''
     or length(regexp_replace(coalesce(p_documento->>'destinatario_documento', ''), '[^0-9]', '', 'g')) not in (11, 14)
     or coalesce(btrim(p_documento->>'destinatario_endereco'), '') = ''
     or coalesce(btrim(p_documento->>'destinatario_bairro'), '') = ''
     or length(regexp_replace(coalesce(p_documento->>'destinatario_cep', ''), '[^0-9]', '', 'g')) <> 8
     or coalesce(btrim(p_documento->>'destinatario_cidade'), '') = ''
     or coalesce(upper(btrim(p_documento->>'destinatario_uf')), '') !~ '^[A-Z]{2}$' then
    raise exception 'Rascunho fiscal incompleto: operação, ambiente, emissão e endereço/documento do destinatário são obrigatórios' using errcode = '22023';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) is distinct from 'array' then
    raise exception 'Os itens fiscais devem ser enviados como uma lista' using errcode = '22023';
  end if;

  if jsonb_array_length(p_itens) = 0 then
    raise exception 'A NF-e exige ao menos um item fiscal' using errcode = '22023';
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb))
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Cada item fiscal deve ser um objeto JSON' using errcode = '22023';
    end if;

    if coalesce(btrim(v_item->>'codigo_produto'), '') = ''
       or coalesce(btrim(v_item->>'descricao_produto'), '') = '' then
      raise exception 'Cada item fiscal exige código e descrição' using errcode = '22023';
    end if;

    if coalesce(btrim(v_item->>'ncm'), '') !~ '^[0-9]{8}$'
       or coalesce(btrim(v_item->>'cfop'), '') !~ '^[0-9]{4}$' then
      raise exception 'Cada item fiscal exige NCM com 8 dígitos e CFOP com 4 dígitos' using errcode = '22023';
    end if;

    if coalesce(btrim(v_item->>'unidade'), '') = ''
       or length(btrim(v_item->>'unidade')) > 6 then
      raise exception 'Cada item fiscal exige uma unidade de medida válida' using errcode = '22023';
    end if;

    if jsonb_typeof(v_item->'item_numero') is distinct from 'number'
       or jsonb_typeof(v_item->'quantidade') is distinct from 'number'
       or jsonb_typeof(v_item->'valor_unitario') is distinct from 'number'
       or jsonb_typeof(v_item->'valor_total') is distinct from 'number'
       or jsonb_typeof(v_item->'valor_desconto') is distinct from 'number' then
      raise exception 'Número, quantidade, preço, desconto e total do item devem ser numéricos' using errcode = '22023';
    end if;

    v_item_numero_numeric := (v_item->>'item_numero')::numeric;
    if v_item_numero_numeric <> trunc(v_item_numero_numeric)
       or v_item_numero_numeric < 1
       or v_item_numero_numeric > 2147483647 then
      raise exception 'A numeração dos itens deve ser um inteiro positivo' using errcode = '22023';
    end if;
    v_item_numero := v_item_numero_numeric::integer;
    v_quantidade := (v_item->>'quantidade')::numeric;
    v_valor_unitario := (v_item->>'valor_unitario')::numeric;
    v_valor_total := (v_item->>'valor_total')::numeric;
    v_valor_desconto := (v_item->>'valor_desconto')::numeric;
    v_origem := nullif(btrim(v_item->>'origem'), '');

    if v_item_numero <= 0 or v_item_numero = any(v_item_numeros) then
      raise exception 'A numeração dos itens deve ser positiva e não pode se repetir' using errcode = '22023';
    end if;
    v_item_numeros := array_append(v_item_numeros, v_item_numero);

    if v_quantidade <= 0 or v_valor_unitario < 0 or v_valor_desconto < 0
       or v_valor_desconto > v_quantidade * v_valor_unitario
       or v_valor_total < 0
       or round(v_valor_total, 2) <> round(v_quantidade * v_valor_unitario - v_valor_desconto, 2) then
      raise exception 'Quantidade, preço, desconto ou total do item são inconsistentes' using errcode = '22023';
    end if;
    v_total_itens := v_total_itens + v_valor_total;

    if v_origem is null or v_origem !~ '^[0-8]$' then
      raise exception 'A origem fiscal do item deve ser um dígito de 0 a 8' using errcode = '22023';
    end if;

    if exists (
      select 1
      from jsonb_each(v_item) field
      where field.key in ('icms_aliquota', 'ipi_aliquota', 'pis_aliquota', 'cofins_aliquota')
        and field.value <> 'null'::jsonb
        and (
          jsonb_typeof(field.value) <> 'number'
          or case
            when jsonb_typeof(field.value) = 'number'
              then (field.value #>> '{}')::numeric not between 0 and 100
            else true
          end
        )
    ) then
      raise exception 'As alíquotas do item devem ser valores numéricos entre 0 e 100' using errcode = '22023';
    end if;

    v_produto_text := nullif(btrim(v_item->>'produto_id'), '');
    if v_produto_text is not null
       and v_produto_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'O identificador do produto do item é inválido' using errcode = '22023';
    end if;
    v_produto_id := v_produto_text::uuid;
    if v_produto_id is not null and not exists (
      select 1
      from public.erp_produtos p
      where p.id = v_produto_id
        and p.empresa_id = v_empresa_id
        and p.ativo = true
    ) then
      raise exception 'Produto fiscal inexistente, inativo ou pertencente a outra empresa' using errcode = '42501';
    end if;
  end loop;

  if jsonb_typeof(p_documento->'valor_produtos') is distinct from 'number'
     or jsonb_typeof(p_documento->'valor_frete') is distinct from 'number'
     or jsonb_typeof(p_documento->'valor_outras_despesas') is distinct from 'number'
     or jsonb_typeof(p_documento->'valor_desconto') is distinct from 'number'
     or jsonb_typeof(p_documento->'valor_ipi') is distinct from 'number'
     or jsonb_typeof(p_documento->'valor_icms_st') is distinct from 'number'
     or jsonb_typeof(p_documento->'valor_total') is distinct from 'number'
     or jsonb_typeof(p_documento->'valor_liquido') is distinct from 'number' then
    raise exception 'Totais da NF-e devem ser informados numericamente' using errcode = '22023';
  end if;

  v_total_produtos := (p_documento->>'valor_produtos')::numeric;
  v_frete := (p_documento->>'valor_frete')::numeric;
  v_outras_despesas := (p_documento->>'valor_outras_despesas')::numeric;
  v_desconto_documento := (p_documento->>'valor_desconto')::numeric;
  v_ipi := (p_documento->>'valor_ipi')::numeric;
  v_icms_st := (p_documento->>'valor_icms_st')::numeric;
  v_total_documento := (p_documento->>'valor_total')::numeric;
  v_total_liquido := (p_documento->>'valor_liquido')::numeric;

  if v_total_produtos < 0
     or v_frete < 0
     or v_outras_despesas < 0
     or v_desconto_documento < 0
     or v_desconto_documento > v_total_itens
     or v_ipi < 0
     or v_icms_st < 0
     or round(v_total_produtos, 2) <> round(v_total_itens, 2)
     or round(v_total_documento, 2) <>
       round(v_total_itens + v_frete + v_outras_despesas + v_ipi + v_icms_st - v_desconto_documento, 2)
     or round(v_total_liquido, 2) <> round(v_total_documento, 2) then
    raise exception 'Totais da NF-e não correspondem aos itens e valores acessórios informados' using errcode = '22023';
  end if;

  if p_documento_id is null then
    insert into public.erp_documentos_fiscais (
      empresa_id, tipo, modelo, serie, numero, status, natureza_operacao, cfop, ambiente,
      data_emissao, data_saida, destinatario_nome, destinatario_documento, destinatario_ie,
      destinatario_email, destinatario_endereco, destinatario_bairro, destinatario_cep,
      destinatario_cidade, destinatario_uf, destinatario_codigo_municipio, pagamento_tipo, valor_pagamento, modalidade_frete, transportadora, placa,
      uf_transportadora, peso_liquido, peso_bruto, volumes, valor_produtos, valor_frete,
      valor_outras_despesas, valor_desconto, base_calculo_icms, valor_icms, base_icms_st,
      valor_icms_st, valor_ipi, valor_pis, valor_cofins, valor_total, valor_liquido
    )
    values (
      v_empresa_id, coalesce(p_documento->>'tipo', 'NF-e'), '55',
      nullif(p_documento->>'serie', '')::integer,
      nullif(p_documento->>'numero', '')::integer, 'Rascunho',
      p_documento->>'natureza_operacao', p_documento->>'cfop',
      coalesce(p_documento->>'ambiente', 'homologacao'),
      nullif(p_documento->>'data_emissao', '')::timestamptz,
      nullif(p_documento->>'data_saida', '')::timestamptz,
      p_documento->>'destinatario_nome', p_documento->>'destinatario_documento',
      p_documento->>'destinatario_ie', p_documento->>'destinatario_email',
      p_documento->>'destinatario_endereco', p_documento->>'destinatario_bairro',
      p_documento->>'destinatario_cep', p_documento->>'destinatario_cidade',
      p_documento->>'destinatario_uf', p_documento->>'destinatario_codigo_municipio', p_documento->>'pagamento_tipo',
      coalesce(nullif(p_documento->>'valor_pagamento', '')::numeric, 0), p_documento->>'modalidade_frete',
      p_documento->>'transportadora', p_documento->>'placa', p_documento->>'uf_transportadora',
      coalesce(nullif(p_documento->>'peso_liquido', '')::numeric, 0),
      coalesce(nullif(p_documento->>'peso_bruto', '')::numeric, 0),
      coalesce(nullif(p_documento->>'volumes', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_produtos', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_frete', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_outras_despesas', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_desconto', '')::numeric, 0),
      coalesce(nullif(p_documento->>'base_calculo_icms', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_icms', '')::numeric, 0),
      coalesce(nullif(p_documento->>'base_icms_st', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_icms_st', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_ipi', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_pis', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_cofins', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_total', '')::numeric, 0),
      coalesce(nullif(p_documento->>'valor_liquido', '')::numeric, 0)
    )
    returning id into v_id;
  else
    select d.* into v_documento
    from public.erp_documentos_fiscais d
    where d.id = p_documento_id
      and d.empresa_id = v_empresa_id
    for update;

    if not found then
      raise exception 'Documento fiscal não encontrado para a empresa autorizada' using errcode = '42501';
    end if;

    if v_documento.modelo is distinct from '55'
       or v_documento.status is distinct from 'Rascunho' then
      raise exception 'Somente NF-e em rascunho pode ser alterada' using errcode = '42501';
    end if;

    update public.erp_documentos_fiscais
    set tipo = coalesce(p_documento->>'tipo', tipo),
        serie = nullif(p_documento->>'serie', '')::integer,
        numero = nullif(p_documento->>'numero', '')::bigint,
        status = 'Rascunho',
        natureza_operacao = p_documento->>'natureza_operacao',
        cfop = p_documento->>'cfop',
        ambiente = coalesce(p_documento->>'ambiente', ambiente),
        data_emissao = nullif(p_documento->>'data_emissao', '')::timestamptz,
        data_saida = nullif(p_documento->>'data_saida', '')::timestamptz,
        destinatario_nome = p_documento->>'destinatario_nome',
        destinatario_documento = p_documento->>'destinatario_documento',
        destinatario_ie = p_documento->>'destinatario_ie',
        destinatario_email = p_documento->>'destinatario_email',
        destinatario_endereco = p_documento->>'destinatario_endereco',
        destinatario_bairro = p_documento->>'destinatario_bairro',
        destinatario_cep = p_documento->>'destinatario_cep',
        destinatario_cidade = p_documento->>'destinatario_cidade',
        destinatario_uf = p_documento->>'destinatario_uf',
        destinatario_codigo_municipio = p_documento->>'destinatario_codigo_municipio',
        pagamento_tipo = p_documento->>'pagamento_tipo',
        valor_pagamento = coalesce(nullif(p_documento->>'valor_pagamento', '')::numeric, 0),
        modalidade_frete = p_documento->>'modalidade_frete',
        transportadora = p_documento->>'transportadora',
        placa = p_documento->>'placa',
        uf_transportadora = p_documento->>'uf_transportadora',
        peso_liquido = coalesce(nullif(p_documento->>'peso_liquido', '')::numeric, 0),
        peso_bruto = coalesce(nullif(p_documento->>'peso_bruto', '')::numeric, 0),
        volumes = coalesce(nullif(p_documento->>'volumes', '')::numeric, 0),
        valor_produtos = coalesce(nullif(p_documento->>'valor_produtos', '')::numeric, 0),
        valor_frete = coalesce(nullif(p_documento->>'valor_frete', '')::numeric, 0),
        valor_outras_despesas = coalesce(nullif(p_documento->>'valor_outras_despesas', '')::numeric, 0),
        valor_desconto = coalesce(nullif(p_documento->>'valor_desconto', '')::numeric, 0),
        base_calculo_icms = coalesce(nullif(p_documento->>'base_calculo_icms', '')::numeric, 0),
        valor_icms = coalesce(nullif(p_documento->>'valor_icms', '')::numeric, 0),
        base_icms_st = coalesce(nullif(p_documento->>'base_icms_st', '')::numeric, 0),
        valor_icms_st = coalesce(nullif(p_documento->>'valor_icms_st', '')::numeric, 0),
        valor_ipi = coalesce(nullif(p_documento->>'valor_ipi', '')::numeric, 0),
        valor_pis = coalesce(nullif(p_documento->>'valor_pis', '')::numeric, 0),
        valor_cofins = coalesce(nullif(p_documento->>'valor_cofins', '')::numeric, 0),
        valor_total = coalesce(nullif(p_documento->>'valor_total', '')::numeric, 0),
        valor_liquido = coalesce(nullif(p_documento->>'valor_liquido', '')::numeric, 0),
        updated_at = now()
    where id = v_documento.id
      and empresa_id = v_empresa_id;

    v_id := v_documento.id;
  end if;

  delete from public.erp_documentos_fiscais_itens
  where documento_id = v_id
    and empresa_id = v_empresa_id;

  insert into public.erp_documentos_fiscais_itens (
    empresa_id, documento_id, produto_id, item_numero, codigo_produto, descricao_produto,
    ncm, cfop, cst_csosn, unidade, quantidade, valor_unitario, valor_total, valor_desconto,
    icms_aliquota, ipi_aliquota, pis_aliquota, cofins_aliquota, pis_cst, cofins_cst,
    lote, origem, updated_at
  )
  select
    v_empresa_id, v_id, nullif(item->>'produto_id', '')::uuid,
    (item->>'item_numero')::integer, item->>'codigo_produto', item->>'descricao_produto',
    item->>'ncm', item->>'cfop', nullif(item->>'cst_csosn', ''),
    coalesce(nullif(item->>'unidade', ''), 'UN'),
    coalesce(nullif(item->>'quantidade', '')::numeric, 0),
    coalesce(nullif(item->>'valor_unitario', '')::numeric, 0),
    coalesce(nullif(item->>'valor_total', '')::numeric, 0),
    coalesce(nullif(item->>'valor_desconto', '')::numeric, 0),
    nullif(item->>'icms_aliquota', '')::numeric,
    nullif(item->>'ipi_aliquota', '')::numeric,
    nullif(item->>'pis_aliquota', '')::numeric,
    nullif(item->>'cofins_aliquota', '')::numeric,
    item->>'pis_cst', item->>'cofins_cst', item->>'lote',
    coalesce(item->>'origem', '0'), now()
  from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) as item;

  insert into public.erp_logs_sistema (
    empresa_id, usuario_id, modulo, acao, entidade, entidade_id, dados
  )
  values (
    v_empresa_id, v_usuario_id, 'Fiscal', 'NFE_RASCUNHO_SALVO',
    'erp_documentos_fiscais', v_id,
    jsonb_build_object(
      'numero', p_documento->>'numero',
      'serie', p_documento->>'serie',
      'itens', jsonb_array_length(coalesce(p_itens, '[]'::jsonb))
    )
  );

  return v_id;
end;
$function$;

revoke all on function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) to authenticated;

create or replace function private.erp_vincular_liberacao_nfe(
  p_liberacao_id uuid,
  p_documento_fiscal_id uuid
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $link$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_header public.erp_liberacoes_nf%rowtype;
  v_document public.erp_documentos_fiscais%rowtype;
  v_customer_document text;
  v_invoice_document text;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada.' using errcode='42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('fiscal','emitir')) then
    raise exception 'Sem permissão fiscal para vincular a liberação.' using errcode='42501';
  end if;

  select * into v_header
  from public.erp_liberacoes_nf
  where id=p_liberacao_id and empresa_id=v_empresa
  for update;
  if not found or v_header.status not in ('ENCAMINHADA','VINCULADA_NFE') then
    raise exception 'Liberação não está pronta para vinculação fiscal.' using errcode='55000';
  end if;
  if v_header.documento_fiscal_id is not null
     and v_header.documento_fiscal_id is distinct from p_documento_fiscal_id then
    raise exception 'Esta liberação já está vinculada a outro documento fiscal.' using errcode='55000';
  end if;

  select * into v_document
  from public.erp_documentos_fiscais d
  where d.id=p_documento_fiscal_id
    and d.empresa_id=v_empresa
    and d.modelo='55'
  for update;
  if not found then
    raise exception 'Documento NF-e não encontrado na empresa ativa.' using errcode='42501';
  end if;
  if v_document.status is distinct from 'Rascunho' then
    raise exception 'Somente um rascunho NF-e pode ser vinculado; status autorizado precisa vir do integrador fiscal.' using errcode='55000';
  end if;

  select regexp_replace(coalesce(c.documento,''),'[^0-9]','','g')
    into v_customer_document
  from public.erp_pedidos_venda p
  join public.erp_clientes c on c.id=p.cliente_id and c.empresa_id=p.empresa_id
  where p.id=v_header.pedido_venda_id and p.empresa_id=v_empresa;
  v_invoice_document := regexp_replace(coalesce(v_document.destinatario_documento,''),'[^0-9]','','g');
  if v_customer_document is null or v_customer_document = ''
     or v_invoice_document is distinct from v_customer_document then
    raise exception 'O documento do destinatário da NF-e não corresponde ao cliente do pedido.' using errcode='22023';
  end if;

  if exists (
    select 1
    from (
      select produto_id, sum(quantidade) as quantidade
      from public.erp_liberacoes_nf_itens
      where liberacao_id=v_header.id and empresa_id=v_empresa
      group by produto_id
    ) r
    full join (
      select produto_id, sum(quantidade) as quantidade
      from public.erp_documentos_fiscais_itens
      where documento_id=v_document.id and empresa_id=v_empresa
      group by produto_id
    ) d using (produto_id)
    where r.produto_id is null or d.produto_id is null
       or round(coalesce(r.quantidade,0),6) <> round(coalesce(d.quantidade,0),6)
  ) then
    raise exception 'Os produtos e quantidades do rascunho NF-e divergem da liberação do Almoxarifado.' using errcode='22023';
  end if;

  update public.erp_liberacoes_nf
  set documento_fiscal_id=p_documento_fiscal_id,
      status='VINCULADA_NFE',
      vinculado_em=coalesce(vinculado_em,now()),
      updated_at=now()
  where id=v_header.id and empresa_id=v_empresa;
  return true;
end;
$link$;

revoke all on function private.erp_vincular_liberacao_nfe(uuid,uuid) from public, anon;
grant execute on function private.erp_vincular_liberacao_nfe(uuid,uuid) to authenticated;
commit;
