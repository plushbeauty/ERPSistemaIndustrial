-- SYSNQRA ERP INDUSTRIAL
-- Estoque: endurece o recebimento transacional de lotes.
-- A RPC passa a validar sessão, tenant, permissão, produto e valores antes de alterar saldo.
-- Não aplicar em produção sem revisar o histórico de migrations e testar em banco de homologação.

begin;

create or replace function public.fn_receber_lote_almoxarifado(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_nf_numero text,
  p_lote_fornecedor text,
  p_quantidade numeric,
  p_status_qualidade text,
  p_certificado_path text,
  p_data_validade date
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_lote_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode = '42501';
  end if;

  if v_empresa_id is null or p_empresa_id is null or p_empresa_id is distinct from v_empresa_id then
    raise exception 'Empresa do recebimento inválida para a sessão atual.' using errcode = '42501';
  end if;

  if not (public.erp_is_master() or public.erp_has_permission('estoque', 'movimentar')) then
    raise exception 'Usuário sem permissão estoque.movimentar para receber lote.' using errcode = '42501';
  end if;

  if p_status_qualidade is distinct from 'APROVADO' then
    raise exception 'Somente lote aprovado pela Qualidade pode entrar no saldo ativo.' using errcode = '22023';
  end if;

  if p_produto_id is null or p_quantidade is null or p_quantidade <= 0
     or p_quantidade::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Insumo e quantidade finita maior que zero são obrigatórios.' using errcode = '22023';
  end if;

  if not exists (
    select 1
      from public.erp_produtos p
     where p.id = p_produto_id
       and p.empresa_id = v_empresa_id
       and p.ativo = true
  ) then
    raise exception 'Produto ativo não encontrado nesta empresa.' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_nf_numero, '')), '') is null then
    raise exception 'O número da NF-e é obrigatório.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_lote_fornecedor, '')), '') is null then
    raise exception 'O lote do fornecedor é obrigatório.' using errcode = '22023';
  end if;

  if p_data_validade is not null and p_data_validade <= current_date then
    raise exception 'A validade do lote deve ser posterior à data do recebimento.' using errcode = '22023';
  end if;

  insert into public.erp_estoque_lotes_rastreabilidade (
    empresa_id, produto_id, nf_numero, lote_fornecedor, quantidade_inicial,
    quantidade_disponivel, status_qualidade, certificado_path, data_validade
  ) values (
    v_empresa_id, p_produto_id, nullif(trim(p_nf_numero), ''), trim(p_lote_fornecedor),
    p_quantidade, p_quantidade, p_status_qualidade, p_certificado_path, p_data_validade
  ) returning id into v_lote_id;

  -- Helper executado pelo owner desta RPC; o lote e o saldo ficam na mesma transação.
  perform public.fn_incrementar_saldo_almoxarifado(v_empresa_id, p_produto_id, p_quantidade);
  return v_lote_id;
end;
$function$;

revoke all on function public.fn_receber_lote_almoxarifado(uuid, uuid, text, text, numeric, text, text, date) from public, anon;
grant execute on function public.fn_receber_lote_almoxarifado(uuid, uuid, text, text, numeric, text, text, date) to authenticated;

-- O helper altera saldo, portanto não deve ser invocável diretamente por clientes.
-- A RPC SECURITY DEFINER acima é o caminho público autorizado para o recebimento.
revoke all on function public.fn_incrementar_saldo_almoxarifado(uuid, uuid, numeric) from public, anon, authenticated;

-- Saldo e rastreabilidade são escritos por RPCs transacionais / funções SGQ,
-- não por mutações REST diretas do navegador.
revoke insert, update, delete on public.erp_produto_estoque from public, anon, authenticated;
revoke insert, update, delete on public.erp_estoque_lotes_rastreabilidade from public, anon, authenticated;
grant select on public.erp_produto_estoque to authenticated;
grant select on public.erp_estoque_lotes_rastreabilidade to authenticated;

commit;
