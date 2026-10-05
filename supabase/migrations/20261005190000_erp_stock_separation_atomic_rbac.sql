-- Estoque: separação atômica e rastreabilidade sem baixa automática de saldo.
-- A separação registra o evento e o cartão; a baixa/reserva de estoque permanece fora deste fluxo.
create or replace function public.erp_estoque_separar_material(
  p_ordem_producao_id uuid,
  p_produto_id uuid,
  p_lote_id uuid,
  p_quantidade numeric
)
returns table (
  separacao_id uuid,
  codigo_rastreabilidade text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa uuid;
  v_usuario uuid;
  v_separacao uuid;
  v_codigo text;
  v_lote_produto uuid;
  v_disponivel numeric;
begin
  v_empresa := public.erp_current_empresa_id();
  v_usuario := public.erp_current_user_id();

  if v_empresa is null or v_usuario is null then
    raise exception 'Sessão ERP/empresa não identificada.';
  end if;

  if not public.erp_has_permission('estoque.movimentar') then
    raise exception 'Usuário sem permissão estoque.movimentar.';
  end if;

  if p_ordem_producao_id is null or p_produto_id is null or coalesce(p_quantidade, 0) <= 0 then
    raise exception 'OP, produto e quantidade são obrigatórios.';
  end if;

  if not exists (
    select 1
      from public.erp_ordens_producao op
     where op.id = p_ordem_producao_id
       and op.empresa_id = v_empresa
  ) then
    raise exception 'Ordem de produção não pertence à empresa atual.';
  end if;

  if not exists (
    select 1
      from public.erp_produtos p
     where p.id = p_produto_id
       and p.empresa_id = v_empresa
       and p.ativo = true
  ) then
    raise exception 'Produto inválido para a empresa atual.';
  end if;

  if p_lote_id is not null then
    select l.produto_id, l.quantidade_disponivel
      into v_lote_produto, v_disponivel
      from public.erp_estoque_lotes l
     where l.id = p_lote_id
       and l.empresa_id = v_empresa
     for update;

    if not found then
      raise exception 'Lote não pertence à empresa atual.';
    end if;

    if v_lote_produto <> p_produto_id then
      raise exception 'Lote informado não pertence ao produto selecionado.';
    end if;

    if coalesce(v_disponivel, 0) < p_quantidade then
      raise exception 'Quantidade superior ao saldo disponível do lote.';
    end if;
  end if;

  insert into public.erp_estoque_separacoes (
    empresa_id,
    ordem_producao_id,
    produto_id,
    lote_id,
    quantidade,
    status,
    codigo_barras
  )
  values (
    v_empresa,
    p_ordem_producao_id,
    p_produto_id,
    p_lote_id,
    p_quantidade,
    'SEPARADO',
    null
  )
  returning id into v_separacao;

  v_codigo := 'SEP-' || upper(left(replace(v_separacao::text, '-', ''), 16));

  insert into public.erp_rastreabilidade_cartoes (
    empresa_id,
    separacao_id,
    codigo
  )
  values (
    v_empresa,
    v_separacao,
    v_codigo
  );

  return query select v_separacao, v_codigo;
end;
$$;

revoke all on function public.erp_estoque_separar_material(uuid, uuid, uuid, numeric) from public, anon;
grant execute on function public.erp_estoque_separar_material(uuid, uuid, uuid, numeric) to authenticated;
