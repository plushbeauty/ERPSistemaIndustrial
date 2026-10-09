-- WMS/SGQ integration: register supplier lots first, release stock only after receiving approval.
create or replace function public.fn_incrementar_saldo_almoxarifado(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_qtd numeric
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
begin
  if v_empresa is null or p_empresa_id is distinct from v_empresa then
    raise exception 'Empresa de estoque inválida para a sessão atual.';
  end if;
  if p_produto_id is null or p_qtd is null or p_qtd <= 0 then
    raise exception 'Produto e quantidade devem ser válidos e maiores que zero.';
  end if;
  if not exists (
    select 1 from public.erp_produtos
    where id = p_produto_id and empresa_id = v_empresa and ativo = true
    for update
  ) then
    raise exception 'Insumo não encontrado ou inativo para a empresa atual.';
  end if;

  insert into public.erp_produto_estoque (empresa_id, produto_id, saldo_fisico)
  values (v_empresa, p_produto_id, p_qtd)
  on conflict (empresa_id, produto_id)
  do update set saldo_fisico = public.erp_produto_estoque.saldo_fisico + excluded.saldo_fisico,
                updated_at = now();
end;
$$;

revoke all on function public.fn_incrementar_saldo_almoxarifado(uuid, uuid, numeric) from public, anon, authenticated;

create or replace function public.erp_reter_lote(p_lote_id uuid, p_motivo text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_lote public.erp_estoque_lotes%rowtype;
  v_trace public.erp_estoque_lotes_rastreabilidade%rowtype;
  v_empresa uuid;
  v_quarentena uuid;
  v_saldo numeric;
  v_disponivel numeric;
  v_localizacao_id uuid;
  v_master boolean;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  if nullif(btrim(p_motivo), '') is null or length(btrim(p_motivo)) < 5 then
    raise exception 'Motivo da retenção é obrigatório.';
  end if;

  select * into v_lote
  from public.erp_estoque_lotes
  where id = p_lote_id
  for update;

  if not found then raise exception 'Lote não encontrado.'; end if;
  v_empresa := v_lote.empresa_id;
  if v_empresa is null then raise exception 'Empresa do lote não identificada.'; end if;
  v_master := coalesce(public.erp_is_master(), false);
  if v_empresa is distinct from public.erp_current_empresa_id() and not v_master then
    raise exception 'Lote fora da empresa do usuário.';
  end if;
  if not v_master
     and not coalesce(public.erp_has_permission('qualidade', 'criar'), false)
     and not coalesce(public.erp_has_permission('qualidade', 'aprovar'), false)
     and not coalesce(public.erp_has_permission('estoque', 'movimentar'), false) then
    raise exception 'Permissão de Qualidade ou movimentação de Estoque necessária para reter lote.';
  end if;

  if v_lote.localizacao is not null then
    select id into v_localizacao_id
    from public.erp_estoque_localizacoes
    where empresa_id = v_empresa and ativo = true
      and codigo || ' · ' || nome = v_lote.localizacao
    limit 1;
  end if;

  v_disponivel := coalesce(v_lote.quantidade_disponivel, 0);
  if upper(coalesce(v_lote.status_inspecao, '')) = 'RETIDO' and v_disponivel > 0 then
    raise exception 'Lote já retido com saldo disponível inconsistente; reconcilie o estoque antes de continuar.';
  end if;
  if upper(coalesce(v_lote.status_inspecao, '')) <> 'RETIDO'
     and coalesce(v_lote.quantidade_reservada, 0) > 0 then
    raise exception 'Lote possui quantidade reservada; libere as reservas antes da quarentena.';
  end if;

  select * into v_trace
  from public.erp_estoque_lotes_rastreabilidade
  where empresa_id = v_empresa
    and produto_id = v_lote.produto_id
    and lote_fornecedor = v_lote.lote_fornecedor
  for update;

  if found and upper(coalesce(v_trace.status_qualidade, '')) = 'RETIDO'
     and coalesce(v_trace.quantidade_disponivel, 0) > 0 then
    raise exception 'Rastreabilidade já retida com saldo disponível inconsistente.';
  end if;
  if found
     and abs(coalesce(v_trace.quantidade_disponivel, 0) - v_disponivel) > 0.0001 then
    raise exception 'Saldo do lote e saldo da rastreabilidade divergem; reconcilie antes da quarentena.';
  end if;

  if upper(coalesce(v_lote.status_inspecao, '')) <> 'RETIDO' and v_disponivel > 0 then
    select saldo_fisico into v_saldo
    from public.erp_produto_estoque
    where empresa_id = v_empresa and produto_id = v_lote.produto_id
    for update;

    if found then
      if coalesce(v_saldo, 0) < v_disponivel then
        raise exception 'Saldo físico agregado menor que o saldo disponível do lote; reconcilie antes da quarentena.';
      end if;
      update public.erp_produto_estoque
      set saldo_fisico = saldo_fisico - v_disponivel, updated_at = now()
      where empresa_id = v_empresa and produto_id = v_lote.produto_id;
    end if;

    insert into public.erp_estoque_movimentos (
      empresa_id, produto_id, tipo, quantidade, origem, documento, observacao, localizacao_origem_id
    ) values (
      v_empresa, v_lote.produto_id, 'saida', v_disponivel,
      'Quarentena Qualidade', v_lote.lote_interno, btrim(p_motivo), v_localizacao_id
    );
  end if;

  update public.erp_estoque_lotes
  set quantidade_disponivel = 0, status_inspecao = 'RETIDO'
  where id = v_lote.id and empresa_id = v_empresa;

  if v_trace.id is not null then
    update public.erp_estoque_lotes_rastreabilidade
    set quantidade_disponivel = 0,
        status_qualidade = case when status_qualidade = 'REPROVADO' then 'REPROVADO' else 'RETIDO' end
    where id = v_trace.id and empresa_id = v_empresa;
  end if;

  select id into v_quarentena
  from public.erp_quarentenas_lotes
  where empresa_id = v_empresa and lote_id = v_lote.id and status = 'RETIDO'
  order by created_at desc
  limit 1
  for update;

  if v_quarentena is not null then
    update public.erp_quarentenas_lotes
    set motivo = btrim(p_motivo), lote_rastreabilidade_id = coalesce(v_trace.id, lote_rastreabilidade_id), quantidade_retirada = coalesce(quantidade_retirada, 0) + v_disponivel
    where id = v_quarentena and empresa_id = v_empresa;
    return v_quarentena;
  end if;

  insert into public.erp_quarentenas_lotes (
    empresa_id, lote_id, lote_rastreabilidade_id, motivo, criado_por, quantidade_retirada
  ) values (
    v_empresa, v_lote.id, v_trace.id, btrim(p_motivo), auth.uid(), v_disponivel
  ) returning id into v_quarentena;

  return v_quarentena;
end;
$$;

revoke all on function public.erp_reter_lote(uuid, text) from public, anon;
grant execute on function public.erp_reter_lote(uuid, text) to authenticated;

create or replace function public.erp_wms_receber_lote_com_qualidade(
  p_produto_id uuid,
  p_fornecedor_id uuid,
  p_localizacao_id uuid,
  p_nf_numero text,
  p_lote_fornecedor text,
  p_quantidade numeric,
  p_status_certificado text,
  p_certificado_path text,
  p_setor_id uuid default null,
  p_severidade text default null,
  p_descricao_rpnc text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_localizacao public.erp_estoque_localizacoes%rowtype;
  v_trace public.erp_estoque_lotes_rastreabilidade%rowtype;
  v_lote public.erp_estoque_lotes%rowtype;
  v_rpnc public.erp_rpnc;
  v_ano text := to_char(current_date, 'YYYY');
  v_numero bigint;
  v_codigo text;
  v_prefix text;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória para receber lote.'; end if;
  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not coalesce(public.erp_has_permission('estoque', 'movimentar'), false) then
    raise exception 'Permissão Estoque/Movimentar necessária para receber lote.';
  end if;

  if p_produto_id is null or not exists (
    select 1 from public.erp_produtos p
    where p.id = p_produto_id and p.empresa_id = v_empresa and p.ativo = true
  ) then raise exception 'Selecione um insumo ativo da empresa atual.'; end if;
  if p_fornecedor_id is null or not exists (
    select 1 from public.erp_fornecedores f
    where f.id = p_fornecedor_id and f.empresa_id = v_empresa and f.ativo = true
  ) then raise exception 'Fornecedor ativo da empresa atual é obrigatório.'; end if;
  if p_localizacao_id is null then raise exception 'Endereço de armazenagem é obrigatório.'; end if;
  select * into v_localizacao
  from public.erp_estoque_localizacoes
  where id = p_localizacao_id and empresa_id = v_empresa and ativo = true;
  if not found then raise exception 'Endereço de estoque inválido ou inativo.'; end if;

  if nullif(btrim(p_lote_fornecedor), '') is null then raise exception 'Lote do fornecedor é obrigatório.'; end if;
  if p_quantidade is null or p_quantidade <= 0 then raise exception 'Quantidade de recebimento deve ser maior que zero.'; end if;
  if p_status_certificado is null or p_status_certificado not in ('APROVADO', 'REPROVADO') then
    raise exception 'Parecer do certificado inválido.';
  end if;
  v_prefix := v_empresa::text || '/recebimento-lotes/';
  if p_certificado_path is null or left(p_certificado_path, length(v_prefix)) <> v_prefix then
    raise exception 'O certificado deve estar armazenado no caminho privado da empresa atual.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'documentos-erp' and name = p_certificado_path
  ) then
    raise exception 'O arquivo de certificado não existe no bucket privado de documentos.';
  end if;

  if p_status_certificado = 'REPROVADO' then
    if not coalesce(public.erp_has_permission('qualidade', 'criar'), false) then
      raise exception 'Permissão Qualidade/Criar necessária para registrar certificado reprovado.';
    end if;
    if p_setor_id is null or not exists (
      select 1 from public.erp_setores s
      where s.id = p_setor_id and s.empresa_id = v_empresa and s.ativo = true
    ) then raise exception 'Selecione setor ativo responsável pela RPNC.'; end if;
    if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then
      raise exception 'Selecione gravidade válida para a RPNC.';
    end if;
    if nullif(btrim(p_descricao_rpnc), '') is null or length(btrim(p_descricao_rpnc)) < 5 then
      raise exception 'Descreva a não conformidade do certificado com pelo menos 5 caracteres.';
    end if;
  end if;

  if exists (
    select 1 from public.erp_estoque_lotes_rastreabilidade
    where empresa_id = v_empresa and produto_id = p_produto_id and lote_fornecedor = btrim(p_lote_fornecedor)
  ) then raise exception 'Este lote do fornecedor já está registrado para o insumo selecionado.'; end if;

  insert into public.erp_estoque_lotes_rastreabilidade (
    empresa_id, produto_id, nf_numero, lote_fornecedor, quantidade_inicial,
    quantidade_disponivel, status_qualidade, certificado_path
  ) values (
    v_empresa, p_produto_id, nullif(btrim(coalesce(p_nf_numero, '')), ''),
    btrim(p_lote_fornecedor), p_quantidade, 0,
    case when p_status_certificado = 'APROVADO' then 'RETIDO' else 'REPROVADO' end,
    p_certificado_path
  ) returning * into v_trace;

  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
  values (v_empresa, 'LOTE-' || v_ano, 1)
  on conflict (empresa_id, chave)
  do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
  returning proximo_valor into v_numero;

  loop
    v_codigo := 'LOT-' || v_ano || '-' || lpad(v_numero::text, 6, '0');
    exit when not exists (
      select 1 from public.erp_estoque_lotes
      where empresa_id = v_empresa and lote_interno = v_codigo
    );
    update public.erp_sgq_contadores
    set proximo_valor = proximo_valor + 1
    where empresa_id = v_empresa and chave = 'LOTE-' || v_ano
    returning proximo_valor into v_numero;
  end loop;

  insert into public.erp_estoque_lotes (
    empresa_id, produto_id, fornecedor_id, nf_numero, lote_interno, lote_fornecedor,
    quantidade_recebida, quantidade_disponivel, quantidade_reservada, localizacao, status_inspecao
  ) values (
    v_empresa, p_produto_id, p_fornecedor_id, nullif(btrim(coalesce(p_nf_numero, '')), ''),
    v_codigo, btrim(p_lote_fornecedor), p_quantidade, 0, 0,
    case when p_localizacao_id is null then null else v_localizacao.codigo || ' · ' || v_localizacao.nome end,
    'AGUARDANDO'
  ) returning * into v_lote;

  if p_status_certificado = 'REPROVADO' then
    perform public.erp_reter_lote(v_lote.id, 'Certificado do fornecedor reprovado: ' || btrim(p_descricao_rpnc));
    select public.erp_sgq_abrir_rpnc(
      btrim(p_descricao_rpnc),
      'Certificado de fornecedor reprovado',
      p_severidade,
      p_setor_id,
      'lote',
      v_lote.id
    ) into v_rpnc;
    return jsonb_build_object(
      'rastreabilidade_id', v_trace.id,
      'lote_id', v_lote.id,
      'lote_interno', v_lote.lote_interno,
      'status_inspecao', 'RETIDO',
      'numero_rpnc', v_rpnc.numero_rpnc
    );
  end if;

  return jsonb_build_object(
    'rastreabilidade_id', v_trace.id,
    'lote_id', v_lote.id,
    'lote_interno', v_lote.lote_interno,
    'status_inspecao', 'AGUARDANDO',
    'numero_rpnc', null
  );
end;
$$;

revoke all on function public.erp_wms_receber_lote_com_qualidade(uuid, uuid, uuid, text, text, numeric, text, text, uuid, text, text) from public, anon;
grant execute on function public.erp_wms_receber_lote_com_qualidade(uuid, uuid, uuid, text, text, numeric, text, text, uuid, text, text) to authenticated;

-- Retire the legacy signature: it cannot express supplier, WMS address or RPNC ownership.
-- New receipts must use erp_wms_receber_lote_com_qualidade.
create or replace function public.fn_receber_lote_almoxarifado(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_nf_numero text,
  p_lote_fornecedor text,
  p_quantidade numeric,
  p_status_qualidade text,
  p_certificado_path text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'RPC legado desativado. Use erp_wms_receber_lote_com_qualidade para registrar fornecedor, endereço e gate SGQ.';
end;
$$;

revoke all on function public.fn_receber_lote_almoxarifado(uuid, uuid, text, text, numeric, text, text) from public, anon, authenticated;
