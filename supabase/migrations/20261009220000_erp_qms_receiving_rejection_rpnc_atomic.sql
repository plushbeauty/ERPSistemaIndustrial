-- Atomic link between failed receiving inspection, stock quarantine and SGQ RPNC.
-- Uses existing ERP tables and existing permission helpers; no schema assumptions beyond the deployed contracts.
create or replace function public.erp_qms_reprovar_recebimento_com_rpnc(
  p_inspecao_id uuid,
  p_setor_id uuid,
  p_severidade text,
  p_descricao text
)
returns public.erp_rpnc
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_inspecao public.erp_qualidade_inspecoes_recebimento%rowtype;
  v_lote public.erp_estoque_lotes%rowtype;
  v_rpnc public.erp_rpnc;
  v_user uuid;
  v_master boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória para reprovar recebimento.';
  end if;

  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;

  v_master := coalesce(public.erp_is_master(), false);
  if not v_master and not coalesce(public.erp_has_permission('qualidade', 'aprovar'), false) then
    raise exception 'Permissão Qualidade/Aprovar necessária para reprovar recebimento.';
  end if;
  if not coalesce(public.erp_has_permission('qualidade', 'criar'), false) then
    raise exception 'Permissão Qualidade/Criar necessária para abrir a RPNC vinculada.';
  end if;

  if p_setor_id is null or not exists (
    select 1
    from public.erp_setores s
    where s.id = p_setor_id
      and s.empresa_id = v_empresa
      and s.ativo = true
  ) then
    raise exception 'Selecione um setor ativo da empresa atual para assumir a RPNC.';
  end if;

  if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then
    raise exception 'Gravidade da RPNC inválida.';
  end if;
  if nullif(btrim(p_descricao), '') is null or length(btrim(p_descricao)) < 5 then
    raise exception 'Descreva a não conformidade com pelo menos 5 caracteres.';
  end if;

  select *
    into v_inspecao
  from public.erp_qualidade_inspecoes_recebimento
  where id = p_inspecao_id
    and empresa_id = v_empresa
  for update;

  if not found then
    raise exception 'Inspeção de recebimento não encontrada na empresa atual.';
  end if;
  if v_inspecao.status <> 'PENDENTE' then
    raise exception 'Somente inspeção pendente pode gerar reprovação e RPNC.';
  end if;

  select *
    into v_lote
  from public.erp_estoque_lotes
  where id = v_inspecao.lote_id
    and empresa_id = v_empresa
  for update;

  if not found then
    raise exception 'Lote associado à inspeção não encontrado na empresa atual.';
  end if;

  -- Nested calls participate in this transaction: if RPNC creation fails,
  -- the quarantine and inspection decision are rolled back as well.
  select usuario_id into v_user from public.erp_qms_current_user() limit 1;
  if v_user is null then raise exception 'Usuário ERP ativo não identificado para registrar a decisão.'; end if;

  perform public.erp_reter_lote(v_lote.id, 'Lote bloqueado pela inspeção de recebimento QMS: ' || btrim(p_descricao));
  update public.erp_qualidade_inspecoes_recebimento
  set status = 'BLOQUEADO', decidido_por = v_user, decidido_em = now(), updated_at = now()
  where id = v_inspecao.id and empresa_id = v_empresa;

  select public.erp_sgq_abrir_rpnc(
    btrim(p_descricao),
    'Inspeção de recebimento',
    p_severidade,
    p_setor_id,
    'lote',
    v_lote.id
  ) into v_rpnc;

  return v_rpnc;
end;
$$;

revoke all on function public.erp_qms_reprovar_recebimento_com_rpnc(uuid, uuid, text, text) from public, anon;
grant execute on function public.erp_qms_reprovar_recebimento_com_rpnc(uuid, uuid, text, text) to authenticated;
