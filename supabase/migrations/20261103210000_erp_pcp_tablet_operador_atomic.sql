begin;

-- Apontamento touch: o servidor valida tenant, OP, receita, instrumento e operador.
-- A transação do cliente é idempotente; reenvios da fila offline não duplicam produção.

create or replace function public.erp_pcp_tablet_gravar_apontamento(
  p_client_transaction_id uuid,
  p_ordem_producao_id uuid,
  p_quantidade_encontrada numeric,
  p_quantidade_refugada numeric,
  p_motivo_refugo text default null,
  p_instrumento text default null,
  p_data_cliente timestamptz default null
)
returns table(apontamento_id uuid, duplicado boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_operador_id uuid;
  v_op public.erp_ordens_producao%rowtype;
  v_receita public.erp_receitas_processos%rowtype;
  v_instrumento public.erp_equipamentos_medicao%rowtype;
  v_id uuid;
begin
  if v_user_id is null then raise exception 'Sessão não autenticada.' using errcode = '28000'; end if;
  if v_empresa_id is null then raise exception 'Empresa da sessão não identificada.' using errcode = '42501'; end if;
  if not (public.erp_is_master() or public.erp_has_permission('production.update') or public.erp_has_permission('production.create')) then
    raise exception 'Permissão insuficiente para apontamento de produção.' using errcode = '42501';
  end if;
  if p_client_transaction_id is null then raise exception 'Identificador da transação obrigatório.'; end if;
  if p_quantidade_encontrada is null or p_quantidade_encontrada <= 0 then raise exception 'Informe quantidade encontrada maior que zero.'; end if;
  if p_quantidade_refugada is null or p_quantidade_refugada < 0 or p_quantidade_refugada > p_quantidade_encontrada then
    raise exception 'Quantidade de refugo inválida.';
  end if;
  if p_quantidade_refugada > 0 and nullif(trim(coalesce(p_motivo_refugo, '')), '') is null then
    raise exception 'Motivo do refugo obrigatório.';
  end if;
  if nullif(upper(trim(coalesce(p_instrumento, ''))), '') is null then raise exception 'TAG do instrumento obrigatória.'; end if;

  select f.id into v_operador_id
    from public.erp_funcionarios f
   where f.empresa_id = v_empresa_id
     and lower(coalesce(f.email, '')) = v_email
     and lower(coalesce(f.status, '')) not in ('inativo','desligado','demitido','cancelado')
   limit 1;
  if v_operador_id is null then raise exception 'Funcionário ativo não vinculado ao e-mail da sessão.' using errcode = '42501'; end if;

  select * into v_op
    from public.erp_ordens_producao o
   where o.id = p_ordem_producao_id and o.empresa_id = v_empresa_id
   for share;
  if not found then raise exception 'OP não encontrada nesta empresa.'; end if;
  if upper(coalesce(v_op.status, '')) not in ('PENDENTE','EM_EXECUCAO','EM_PRODUCAO','EM_EXECUCAO') then
    raise exception 'OP não está em situação que permita apontamento.';
  end if;

  select * into v_receita
    from public.erp_receitas_processos r
   where r.empresa_id = v_empresa_id
     and r.produto_id = v_op.produto_id
     and r.status = 'APROVADA'
   order by r.versao desc
   limit 1;
  if not found then raise exception 'Não existe receita de processo APROVADA para o produto da OP.'; end if;

  select * into v_instrumento
    from public.erp_equipamentos_medicao e
   where e.empresa_id = v_empresa_id
     and upper(e.codigo) = upper(trim(p_instrumento))
   limit 1
   for share;
  if not found or upper(trim(coalesce(v_instrumento.status, ''))) <> 'APROVADO'
     or v_instrumento.proxima_calibracao is null
     or v_instrumento.proxima_calibracao < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'TAG bloqueada: instrumento inexistente, vencido ou não aprovado no banco.';
  end if;

  -- O identificador UUID é único no banco; a resposta duplicada permite limpar a fila com segurança.
  insert into public.erp_apontamentos_processo (
    empresa_id, processo_id, receita_id, ordem_producao_id, maquina_id, ferramenta_id,
    inicio_em, fim_em, quantidade_planejada, quantidade_boa, quantidade_refugada,
    quantidade_reprocessada, operador_id, criado_por, client_transaction_id, parametros_reais
  ) values (
    v_empresa_id, v_receita.processo_id, v_receita.id, v_op.id,
    coalesce(v_op.maquina_id, v_receita.maquina_id), v_receita.ferramenta_id,
    now(), now(), coalesce(v_op.quantidade_planejada, 0),
    p_quantidade_encontrada - p_quantidade_refugada, p_quantidade_refugada, 0,
    v_operador_id, v_user_id, p_client_transaction_id,
    jsonb_build_object(
      'origem','PCP_TABLET_OPERADOR',
      'instrumento',upper(trim(p_instrumento)),
      'motivo_refugo',nullif(trim(coalesce(p_motivo_refugo,'')),''),
      'quantidade_encontrada',p_quantidade_encontrada,
      'data_cliente',p_data_cliente,
      'client_transaction_id',p_client_transaction_id
    )
  )
  on conflict (client_transaction_id) where client_transaction_id is not null do nothing
  returning id into v_id;

  if v_id is not null then
    return query select v_id, false;
    return;
  end if;

  select a.id into v_id
    from public.erp_apontamentos_processo a
   where a.client_transaction_id = p_client_transaction_id
     and a.empresa_id = v_empresa_id;
  if v_id is null then raise exception 'Identificador de transação já utilizado fora desta empresa.' using errcode = '23505'; end if;
  return query select v_id, true;
end;
$$;

revoke all on function public.erp_pcp_tablet_gravar_apontamento(uuid,uuid,numeric,numeric,text,text,timestamptz) from public, anon;
grant execute on function public.erp_pcp_tablet_gravar_apontamento(uuid,uuid,numeric,numeric,text,text,timestamptz) to authenticated;

notify pgrst, 'reload schema';
commit;
