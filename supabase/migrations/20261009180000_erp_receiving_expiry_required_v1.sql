begin;

alter table public.erp_estoque_lotes_rastreabilidade
  add column if not exists validade date;

create or replace function public.fn_receber_lote_almoxarifado(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_nf_numero text,
  p_lote_fornecedor text,
  p_quantidade numeric,
  p_status_qualidade text,
  p_certificado_path text,
  p_validade date
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_lote_id uuid;
begin
  if v_empresa_id is null or p_empresa_id is null or p_empresa_id <> v_empresa_id then
    raise exception 'Empresa do recebimento inválida para a sessão atual.';
  end if;
  if p_status_qualidade is distinct from 'APROVADO' then
    raise exception 'Ação interrompida: lote com laudo REPROVADO não pode entrar no saldo ativo.';
  end if;
  if p_produto_id is null or p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Insumo e quantidade devem ser válidos e maiores que zero.';
  end if;
  if nullif(trim(coalesce(p_lote_fornecedor, '')), '') is null then
    raise exception 'O lote do fornecedor é obrigatório.';
  end if;
  if p_validade is null or p_validade < current_date then
    raise exception 'A validade é obrigatória e não pode estar vencida no recebimento.';
  end if;
  if nullif(trim(coalesce(p_certificado_path, '')), '') is null
    or p_certificado_path not like 'empresas/' || v_empresa_id::text || '/recebimento-lotes/%' then
    raise exception 'Certificado PDF válido da empresa é obrigatório para receber o lote.';
  end if;
  if not exists (
    select 1 from public.erp_produtos
    where id = p_produto_id and empresa_id = v_empresa_id and ativo = true
  ) then
    raise exception 'Insumo não encontrado ou inativo para a empresa atual.';
  end if;

  insert into public.erp_estoque_lotes_rastreabilidade (
    empresa_id, produto_id, nf_numero, lote_fornecedor, quantidade_inicial,
    quantidade_disponivel, status_qualidade, certificado_path, validade
  ) values (
    v_empresa_id, p_produto_id, nullif(trim(p_nf_numero), ''), trim(p_lote_fornecedor),
    p_quantidade, p_quantidade, p_status_qualidade, trim(p_certificado_path), p_validade
  ) returning id into v_lote_id;

  perform public.fn_incrementar_saldo_almoxarifado(v_empresa_id, p_produto_id, p_quantidade);
  return v_lote_id;
end;
$function$;

create or replace function public.fn_receber_lote_almoxarifado(
  p_empresa_id uuid,
  p_produto_id uuid,
  p_nf_numero text,
  p_lote_fornecedor text,
  p_quantidade numeric,
  p_status_qualidade text,
  p_certificado_path text default null
) returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
begin
  raise exception 'Validade do lote obrigatória. Utilize a assinatura de recebimento com p_validade.';
end;
$function$;

revoke all on function public.fn_receber_lote_almoxarifado(uuid,uuid,text,text,numeric,text,text,date) from public, anon;
grant execute on function public.fn_receber_lote_almoxarifado(uuid,uuid,text,text,numeric,text,text,date) to authenticated;
revoke all on function public.fn_receber_lote_almoxarifado(uuid,uuid,text,text,numeric,text,text) from public, anon;
grant execute on function public.fn_receber_lote_almoxarifado(uuid,uuid,text,text,numeric,text,text) to authenticated;

commit;
