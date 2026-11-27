-- SYSNQRA ERP INDUSTRIAL — apontamento transacional com quantidade reprocessada
-- Aditiva: preserva a RPC manual existente e registra retrabalho na coluna real já existente.
begin;

create or replace function public.erp_apontamento_registrar_manual_com_retrabalho(
  p_ordem_producao_id uuid,
  p_processo_id uuid,
  p_receita_id uuid,
  p_maquina_id uuid,
  p_ferramenta_id uuid,
  p_operador_id uuid,
  p_inicio_em timestamptz,
  p_fim_em timestamptz,
  p_quantidade_planejada numeric,
  p_quantidade_boa numeric,
  p_quantidade_refugada numeric,
  p_quantidade_reprocessada numeric,
  p_motivo_parada text,
  p_observacoes text,
  p_programacao_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_op public.erp_ordens_producao%rowtype;
  v_receita public.erp_receitas_processos%rowtype;
  v_apontamento uuid;
  v_boa numeric := greatest(coalesce(p_quantidade_boa, 0), 0);
  v_refugo numeric := greatest(coalesce(p_quantidade_refugada, 0), 0);
  v_reprocessada numeric := greatest(coalesce(p_quantidade_reprocessada, 0), 0);
  v_lote jsonb;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'ERP_TENANT_NOT_FOUND';
  end if;

  if not (public.erp_is_master() or public.erp_has_permission('production.update')) then
    raise exception 'SEM_PERMISSAO_PARA_APONTAMENTO_MANUAL';
  end if;

  if p_ordem_producao_id is null or p_processo_id is null or p_receita_id is null
    or p_maquina_id is null or p_operador_id is null or p_inicio_em is null then
    raise exception 'APONTAMENTO_MANUAL_INCOMPLETO';
  end if;

  if p_quantidade_planejada is null or p_quantidade_planejada <= 0 then
    raise exception 'QUANTIDADE_PLANEJADA_INVALIDA';
  end if;

  if p_quantidade_reprocessada is not null and p_quantidade_reprocessada < 0 then
    raise exception 'QUANTIDADE_REPROCESSADA_INVALIDA';
  end if;

  if p_fim_em is not null and p_fim_em <= p_inicio_em then
    raise exception 'HORARIO_FINAL_ANTERIOR_AO_INICIO';
  end if;

  if p_fim_em is not null and v_boa + v_refugo + v_reprocessada <= 0 then
    raise exception 'QUANTIDADE_APONTADA_INVALIDA';
  end if;

  if p_fim_em is null and v_boa + v_refugo + v_reprocessada > 0 then
    raise exception 'NAO_INFORME_QUANTIDADE_FINAL_SE_APONTAMENTO_CONTINUA_ABERTO';
  end if;

  if v_refugo > 0 and nullif(trim(coalesce(p_observacoes, '')), '') is null then
    raise exception 'JUSTIFICATIVA_REFUGO_OBRIGATORIA';
  end if;

  select * into v_op
    from public.erp_ordens_producao
   where id = p_ordem_producao_id and empresa_id = v_empresa
   for update;

  if not found then
    raise exception 'OP_FORA_DO_TENANT';
  end if;

  select * into v_receita
    from public.erp_receitas_processos
   where id = p_receita_id
     and empresa_id = v_empresa
     and produto_id = v_op.produto_id
     and processo_id = p_processo_id;

  if not found or v_receita.status <> 'APROVADA' then
    raise exception 'RECEITA_NAO_APROVADA_PARA_PRODUTO_E_PROCESSO';
  end if;

  if v_receita.maquina_id is not null and v_receita.maquina_id <> p_maquina_id then
    raise exception 'MAQUINA_DIFERENTE_DA_RECEITA_APROVADA';
  end if;

  if not exists (
    select 1 from public.erp_maquinas
     where id = p_maquina_id and empresa_id = v_empresa and ativo = true
  ) then
    raise exception 'MAQUINA_FORA_DO_TENANT';
  end if;

  if not exists (
    select 1 from public.erp_funcionarios
     where id = p_operador_id
       and empresa_id = v_empresa
       and data_demissao is null
       and upper(coalesce(status_colaborador, status, '')) not in ('INATIVO', 'DEMITIDO', 'DESLIGADO')
  ) then
    raise exception 'OPERADOR_FORA_DO_TENANT_OU_INATIVO';
  end if;

  if p_programacao_id is not null and not exists (
    select 1 from public.erp_pcp_programacoes
     where id = p_programacao_id and empresa_id = v_empresa
  ) then
    raise exception 'PROGRAMACAO_FORA_DO_TENANT';
  end if;

  if exists (
    select 1 from public.erp_apontamentos_processo
     where empresa_id = v_empresa
       and ordem_producao_id = p_ordem_producao_id
       and operador_id = p_operador_id
       and fim_em is null
  ) then
    raise exception 'OPERADOR_JA_TEM_APONTAMENTO_ABERTO_NESTA_OP';
  end if;

  insert into public.erp_apontamentos_processo (
    empresa_id, processo_id, receita_id, ordem_producao_id, maquina_id, ferramenta_id,
    inicio_em, fim_em, quantidade_planejada, quantidade_boa, quantidade_refugada,
    quantidade_reprocessada, motivo_parada, observacoes, operador_id, criado_por, parametros_reais
  ) values (
    v_empresa, p_processo_id, p_receita_id, p_ordem_producao_id, p_maquina_id, p_ferramenta_id,
    p_inicio_em, p_fim_em, p_quantidade_planejada, v_boa, v_refugo,
    v_reprocessada,
    nullif(trim(coalesce(p_motivo_parada, '')), ''),
    nullif(trim(coalesce(p_observacoes, '')), ''),
    p_operador_id, auth.uid(),
    jsonb_build_object(
      'origem', 'PCP_EXECUCAO_MANUAL',
      'revisao_receita', v_receita.versao,
      'quantidade_reprocessada', v_reprocessada
    )
  )
  returning id into v_apontamento;

  if p_fim_em is not null then
    if p_programacao_id is not null then
      update public.erp_pcp_programacoes
         set quantidade_produzida = coalesce(quantidade_produzida, 0) + v_boa,
             quantidade_refugada = coalesce(quantidade_refugada, 0) + v_refugo
       where id = p_programacao_id and empresa_id = v_empresa;
    end if;

    update public.erp_ordens_producao
       set quantidade_produzida = coalesce(quantidade_produzida, 0) + v_boa
     where id = p_ordem_producao_id and empresa_id = v_empresa;

    if v_boa > 0 then
      v_lote := public.erp_gerar_lote_producao(p_ordem_producao_id, v_boa, p_fim_em::date);
    end if;
  end if;

  return jsonb_build_object(
    'id', v_apontamento,
    'ordem_producao_id', p_ordem_producao_id,
    'inicio_em', p_inicio_em,
    'fim_em', p_fim_em,
    'quantidade_boa', v_boa,
    'quantidade_refugada', v_refugo,
    'quantidade_reprocessada', v_reprocessada,
    'lote_id', v_lote->>'id',
    'lote_interno', v_lote->>'lote_interno',
    'modo_lote', v_lote->>'modo_lote'
  );
end;
$function$;

revoke all on function public.erp_apontamento_registrar_manual_com_retrabalho(
  uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  numeric, numeric, numeric, numeric, text, text, uuid
) from public, anon;

grant execute on function public.erp_apontamento_registrar_manual_com_retrabalho(
  uuid, uuid, uuid, uuid, uuid, uuid, timestamptz, timestamptz,
  numeric, numeric, numeric, numeric, text, text, uuid
) to authenticated;

commit;
