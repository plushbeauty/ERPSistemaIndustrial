-- Keep the receiving inspection decision on the existing tenant-scoped inspection and lot tables.
create or replace function public.erp_qms_decidir_inspecao_recebimento(
  p_inspecao_id uuid,
  p_decisao text
) returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_lote_id uuid;
  v_resultado text;
  v_status_lote text;
begin
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;

  if p_decisao is null or p_decisao not in ('APROVAR', 'BLOQUEAR') then
    raise exception 'Decisão de inspeção inválida.';
  end if;

  select lote_id
    into v_lote_id
    from public.qualidade_inspecoes
   where id = p_inspecao_id
     and empresa_id = v_empresa_id
     and tipo = 'recebimento'
   for update;

  if not found then
    raise exception 'Inspeção de recebimento não encontrada na empresa atual.';
  end if;

  v_resultado := case when p_decisao = 'APROVAR' then 'aprovado' else 'reprovado' end;
  v_status_lote := case when p_decisao = 'APROVAR' then 'APROVADO' else 'BLOQUEADO' end;

  update public.qualidade_inspecoes
     set resultado = v_resultado
   where id = p_inspecao_id
     and empresa_id = v_empresa_id;

  if not found then
    raise exception 'Não foi possível atualizar o resultado da inspeção.';
  end if;

  update public.erp_estoque_lotes
     set status_inspecao = v_status_lote
   where id = v_lote_id
     and empresa_id = v_empresa_id;

  if not found then
    raise exception 'Não foi possível atualizar o status de inspeção do lote.';
  end if;
end;
$function$;

grant execute on function public.erp_qms_decidir_inspecao_recebimento(uuid, text) to authenticated;
notify pgrst, 'reload schema';
