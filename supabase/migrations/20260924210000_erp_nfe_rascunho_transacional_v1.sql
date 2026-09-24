/*
 * REV-079 — NF-e rascunho transacional
 * Integração: ERP fiscal + itens + auditoria tenant-aware.
 */
alter table public.erp_documentos_fiscais
  add column if not exists cfop text,
  add column if not exists ambiente text not null default 'homologacao',
  add column if not exists data_saida timestamptz,
  add column if not exists destinatario_ie text,
  add column if not exists destinatario_email text,
  add column if not exists destinatario_endereco text,
  add column if not exists destinatario_bairro text,
  add column if not exists destinatario_cep text,
  add column if not exists destinatario_cidade text,
  add column if not exists destinatario_uf text,
  add column if not exists modalidade_frete text,
  add column if not exists transportadora text,
  add column if not exists placa text,
  add column if not exists uf_transportadora text,
  add column if not exists peso_liquido numeric(18,6) not null default 0,
  add column if not exists peso_bruto numeric(18,6) not null default 0,
  add column if not exists volumes numeric(18,3) not null default 0,
  add column if not exists base_icms_st numeric(18,2) not null default 0,
  add column if not exists valor_icms_st numeric(18,2) not null default 0;

alter table public.erp_produtos
  add column if not exists catalogo_disponivel boolean not null default false;

create index if not exists idx_erp_produtos_catalogo
  on public.erp_produtos(empresa_id, ativo, catalogo_disponivel, codigo);

alter table public.erp_documentos_fiscais_itens
  add column if not exists valor_desconto numeric(18,2) not null default 0,
  add column if not exists pis_aliquota numeric(7,4),
  add column if not exists cofins_aliquota numeric(7,4),
  add column if not exists pis_cst text,
  add column if not exists cofins_cst text,
  add column if not exists lote text;

create or replace function public.erp_salvar_rascunho_nfe(
  p_documento_id uuid,
  p_documento jsonb,
  p_itens jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_empresa_id uuid := nullif(p_documento->>'empresa_id','')::uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão de autenticação obrigatória';
  end if;

  if v_empresa_id is null then
    raise exception 'empresa_id é obrigatório';
  end if;

  if not (v_empresa_id = public.erp_current_company_id() or public.erp_is_master()) then
    raise exception 'Empresa não autorizada para esta sessão';
  end if;

  if p_documento_id is null then
    insert into public.erp_documentos_fiscais (
      empresa_id,tipo,modelo,serie,numero,status,natureza_operacao,cfop,ambiente,
      data_emissao,data_saida,destinatario_nome,destinatario_documento,destinatario_ie,
      destinatario_email,destinatario_endereco,destinatario_bairro,destinatario_cep,
      destinatario_cidade,destinatario_uf,modalidade_frete,transportadora,placa,
      uf_transportadora,peso_liquido,peso_bruto,volumes,valor_produtos,valor_frete,
      valor_outras_despesas,valor_desconto,base_calculo_icms,valor_icms,base_icms_st,
      valor_icms_st,valor_ipi,valor_pis,valor_cofins,valor_total,valor_liquido
    )
    values (
      v_empresa_id,coalesce(p_documento->>'tipo','NF-e'),'55',
      nullif(p_documento->>'serie','')::integer,nullif(p_documento->>'numero','')::integer,
      coalesce(p_documento->>'status','Rascunho'),p_documento->>'natureza_operacao',
      p_documento->>'cfop',coalesce(p_documento->>'ambiente','homologacao'),
      nullif(p_documento->>'data_emissao','')::timestamptz,
      nullif(p_documento->>'data_saida','')::timestamptz,
      p_documento->>'destinatario_nome',p_documento->>'destinatario_documento',
      p_documento->>'destinatario_ie',p_documento->>'destinatario_email',
      p_documento->>'destinatario_endereco',p_documento->>'destinatario_bairro',
      p_documento->>'destinatario_cep',p_documento->>'destinatario_cidade',
      p_documento->>'destinatario_uf',p_documento->>'modalidade_frete',
      p_documento->>'transportadora',p_documento->>'placa',p_documento->>'uf_transportadora',
      coalesce(nullif(p_documento->>'peso_liquido','')::numeric,0),
      coalesce(nullif(p_documento->>'peso_bruto','')::numeric,0),
      coalesce(nullif(p_documento->>'volumes','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_produtos','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_frete','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_outras_despesas','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_desconto','')::numeric,0),
      coalesce(nullif(p_documento->>'base_calculo_icms','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_icms','')::numeric,0),
      coalesce(nullif(p_documento->>'base_icms_st','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_icms_st','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_ipi','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_pis','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_cofins','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_total','')::numeric,0),
      coalesce(nullif(p_documento->>'valor_liquido','')::numeric,0)
    )
    returning id into v_id;
  else
    select id into v_id
      from public.erp_documentos_fiscais
     where id = p_documento_id and empresa_id = v_empresa_id
     for update;

    if v_id is null then
      raise exception 'Documento fiscal não encontrado para a empresa da sessão';
    end if;

    update public.erp_documentos_fiscais
       set tipo=coalesce(p_documento->>'tipo',tipo),
           modelo=coalesce(p_documento->>'modelo',modelo),
           serie=nullif(p_documento->>'serie','')::integer,
           numero=nullif(p_documento->>'numero','')::bigint,
           status=coalesce(p_documento->>'status',status),
           natureza_operacao=p_documento->>'natureza_operacao',
           cfop=p_documento->>'cfop',
           ambiente=coalesce(p_documento->>'ambiente',ambiente),
           data_emissao=nullif(p_documento->>'data_emissao','')::timestamptz,
           data_saida=nullif(p_documento->>'data_saida','')::timestamptz,
           destinatario_nome=p_documento->>'destinatario_nome',
           destinatario_documento=p_documento->>'destinatario_documento',
           destinatario_ie=p_documento->>'destinatario_ie',
           destinatario_email=p_documento->>'destinatario_email',
           destinatario_endereco=p_documento->>'destinatario_endereco',
           destinatario_bairro=p_documento->>'destinatario_bairro',
           destinatario_cep=p_documento->>'destinatario_cep',
           destinatario_cidade=p_documento->>'destinatario_cidade',
           destinatario_uf=p_documento->>'destinatario_uf',
           modalidade_frete=p_documento->>'modalidade_frete',
           transportadora=p_documento->>'transportadora',
           placa=p_documento->>'placa',
           uf_transportadora=p_documento->>'uf_transportadora',
           peso_liquido=coalesce(nullif(p_documento->>'peso_liquido','')::numeric,0),
           peso_bruto=coalesce(nullif(p_documento->>'peso_bruto','')::numeric,0),
           volumes=coalesce(nullif(p_documento->>'volumes','')::numeric,0),
           valor_produtos=coalesce(nullif(p_documento->>'valor_produtos','')::numeric,0),
           valor_frete=coalesce(nullif(p_documento->>'valor_frete','')::numeric,0),
           valor_outras_despesas=coalesce(nullif(p_documento->>'valor_outras_despesas','')::numeric,0),
           valor_desconto=coalesce(nullif(p_documento->>'valor_desconto','')::numeric,0),
           base_calculo_icms=coalesce(nullif(p_documento->>'base_calculo_icms','')::numeric,0),
           valor_icms=coalesce(nullif(p_documento->>'valor_icms','')::numeric,0),
           base_icms_st=coalesce(nullif(p_documento->>'base_icms_st','')::numeric,0),
           valor_icms_st=coalesce(nullif(p_documento->>'valor_icms_st','')::numeric,0),
           valor_ipi=coalesce(nullif(p_documento->>'valor_ipi','')::numeric,0),
           valor_pis=coalesce(nullif(p_documento->>'valor_pis','')::numeric,0),
           valor_cofins=coalesce(nullif(p_documento->>'valor_cofins','')::numeric,0),
           valor_total=coalesce(nullif(p_documento->>'valor_total','')::numeric,0),
           valor_liquido=coalesce(nullif(p_documento->>'valor_liquido','')::numeric,0),
           updated_at=now()
     where id=v_id and empresa_id=v_empresa_id;
  end if;

  delete from public.erp_documentos_fiscais_itens
   where documento_id=v_id and empresa_id=v_empresa_id;

  insert into public.erp_documentos_fiscais_itens (
    empresa_id,documento_id,produto_id,item_numero,codigo_produto,descricao_produto,
    ncm,cfop,cst_csosn,unidade,quantidade,valor_unitario,valor_total,valor_desconto,
    icms_aliquota,ipi_aliquota,pis_aliquota,cofins_aliquota,pis_cst,cofins_cst,
    lote,origem,updated_at
  )
  select
    v_empresa_id,v_id,nullif(item->>'produto_id','')::uuid,(item->>'item_numero')::integer,
    item->>'codigo_produto',item->>'descricao_produto',item->>'ncm',item->>'cfop',
    nullif(item->>'cst_csosn',''),coalesce(nullif(item->>'unidade',''),'UN'),
    coalesce(nullif(item->>'quantidade','')::numeric,0),
    coalesce(nullif(item->>'valor_unitario','')::numeric,0),
    coalesce(nullif(item->>'valor_total','')::numeric,0),
    coalesce(nullif(item->>'valor_desconto','')::numeric,0),
    nullif(item->>'icms_aliquota','')::numeric,nullif(item->>'ipi_aliquota','')::numeric,
    nullif(item->>'pis_aliquota','')::numeric,nullif(item->>'cofins_aliquota','')::numeric,
    item->>'pis_cst',item->>'cofins_cst',item->>'lote',coalesce(item->>'origem','0'),now()
  from jsonb_array_elements(coalesce(p_itens,'[]'::jsonb)) as item;

  return v_id;
end;
$$;

revoke all on function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) from public;
grant execute on function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) to authenticated;
