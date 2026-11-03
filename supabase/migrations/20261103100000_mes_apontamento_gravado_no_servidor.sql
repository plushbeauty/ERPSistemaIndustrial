-- Chão de Fábrica / Portal do Operador: o apontamento passa a ser carimbado e liquidado pelo servidor.
-- Revisão SYSNQRA ERP INDUSTRIAL | 2026-11-03 | REV-MES-APONTAMENTO-SERVIDOR-20261103-01
-- Determinação do proprietário: "O prazo deve ser calculado pelo servidor, e não pelo relógio do navegador."
-- O relógio do posto deixava de valer também para a duração da produção e para a baixa na programação.
-- security definer + busca sempre filtrada por erp_current_empresa_id(): o operador não precisa de
-- pcp.update direto na tabela, e nenhum write atravessa tenant. Padrão já usado em erp_registrar_refugo.

-- Início de produção: horário do banco, ficha aprovada conferida no banco e um apontamento aberto por operador/OP.
create or replace function public.erp_apontamento_iniciar(
  p_programacao_id uuid,
  p_ordem_producao_id uuid,
  p_processo_id uuid,
  p_receita_id uuid,
  p_maquina_id uuid,
  p_ferramenta_id uuid,
  p_operador_id uuid,
  p_quantidade_planejada numeric
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_receita public.erp_receitas_processos;
  v_apontamento public.erp_apontamentos_processo;
  v_quantidade numeric := greatest(coalesce(p_quantidade_planejada, 0), 0);
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória para apontar produção.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada; atualização não gravada.'; end if;
  if p_ordem_producao_id is null or p_processo_id is null or p_receita_id is null
     or p_maquina_id is null or p_operador_id is null then
    raise exception 'Apontamento incompleto: OP, processo, ficha aprovada, máquina e operador são obrigatórios.';
  end if;
  if v_quantidade <= 0 then raise exception 'Quantidade planejada deve ser maior que zero.'; end if;

  select * into v_receita
    from public.erp_receitas_processos
    where id = p_receita_id and empresa_id = v_empresa and processo_id = p_processo_id;
  if not found then raise exception 'Ficha de processo não encontrada na empresa autenticada.'; end if;
  if v_receita.status <> 'APROVADA' then raise exception 'Somente ficha de processo aprovada libera o início da produção.'; end if;

  perform 1 from public.erp_funcionarios
    where id = p_operador_id and empresa_id = v_empresa;
  if not found then raise exception 'Funcionário fora da empresa autenticada.'; end if;

  if p_programacao_id is not null then
    perform 1 from public.erp_pcp_programacoes
      where id = p_programacao_id and empresa_id = v_empresa;
    if not found then raise exception 'Programação não encontrada na empresa autenticada.'; end if;
  end if;

  perform 1 from public.erp_apontamentos_processo
    where empresa_id = v_empresa
      and ordem_producao_id = p_ordem_producao_id
      and operador_id = p_operador_id
      and fim_em is null
    for update;
  if found then raise exception 'Esta OP já tem um apontamento em andamento para seu usuário.'; end if;

  insert into public.erp_apontamentos_processo
    (empresa_id, processo_id, receita_id, ordem_producao_id, maquina_id, ferramenta_id,
     inicio_em, quantidade_planejada, quantidade_boa, quantidade_refugada,
     operador_id, criado_por, parametros_reais)
  values
    (v_empresa, p_processo_id, p_receita_id, p_ordem_producao_id, p_maquina_id, p_ferramenta_id,
     now(), v_quantidade, 0, 0,
     p_operador_id, auth.uid(),
     jsonb_build_object(
       'origem', 'AREA_FUNCIONARIO_CPP',
       'programacao_id', p_programacao_id,
       'revisao_receita', v_receita.versao
     ))
  returning * into v_apontamento;

  return jsonb_build_object(
    'id', v_apontamento.id,
    'inicio_em', v_apontamento.inicio_em,
    'fim_em', v_apontamento.fim_em,
    'quantidade_boa', v_apontamento.quantidade_boa,
    'quantidade_refugada', v_apontamento.quantidade_refugada,
    'ordem_producao_id', v_apontamento.ordem_producao_id,
    'operador_id', v_apontamento.operador_id
  );
end;
$$;

comment on function public.erp_apontamento_iniciar is
  'Abre o apontamento do chão de fábrica com horário do servidor e ficha aprovada validada no banco.';

revoke all on function public.erp_apontamento_iniciar from anon;
revoke all on function public.erp_apontamento_iniciar from public;
grant execute on function public.erp_apontamento_iniciar to authenticated;

-- Finalização: fim_em do banco, quantidades conferidas e baixa imediata da programação do PCP.
create or replace function public.erp_apontamento_finalizar(
  p_apontamento_id uuid,
  p_operador_id uuid,
  p_programacao_id uuid,
  p_quantidade_boa numeric,
  p_quantidade_refugada numeric,
  p_motivo_parada text,
  p_observacoes text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_boa numeric := greatest(coalesce(p_quantidade_boa, 0), 0);
  v_refugo numeric := greatest(coalesce(p_quantidade_refugada, 0), 0);
  v_inicio timestamptz;
  v_fim timestamptz := now();
  v_op uuid;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória para finalizar o apontamento.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada; atualização não gravada.'; end if;
  if p_apontamento_id is null or p_operador_id is null then
    raise exception 'Apontamento incompleto: registre o início antes de finalizar.';
  end if;
  if p_quantidade_boa is null or p_quantidade_refugada is null
     or p_quantidade_boa < 0 or p_quantidade_refugada < 0 then
    raise exception 'Informe quantidades válidas; peças boas e refugadas não podem ser negativas.';
  end if;
  if v_boa + v_refugo <= 0 then
    raise exception 'A soma de peças boas e refugadas precisa ser maior que zero.';
  end if;
  if v_refugo > 0 and nullif(trim(coalesce(p_observacoes, '')), '') is null then
    raise exception 'Descreva o defeito/causa quando houver peças refugadas.';
  end if;

  select inicio_em, ordem_producao_id into v_inicio, v_op
    from public.erp_apontamentos_processo
    where id = p_apontamento_id and empresa_id = v_empresa and operador_id = p_operador_id
    for update;
  if not found then raise exception 'Apontamento não encontrado para este operador na empresa autenticada.'; end if;

  update public.erp_apontamentos_processo
     set fim_em = v_fim,
         quantidade_boa = v_boa,
         quantidade_refugada = v_refugo,
         motivo_parada = nullif(trim(coalesce(p_motivo_parada, '')), ''),
         observacoes = nullif(trim(coalesce(p_observacoes, '')), ''),
         parametros_reais = coalesce(parametros_reais, '{}'::jsonb)
           || jsonb_build_object('duracao_seg', greatest(extract(epoch from (v_fim - v_inicio)), 0))
   where id = p_apontamento_id and empresa_id = v_empresa and fim_em is null;
  if not found then raise exception 'Nenhum apontamento foi atualizado: o registro já foi fechado. Atualize a tela.'; end if;

  if p_programacao_id is not null then
    update public.erp_pcp_programacoes
       set quantidade_produzida = coalesce(quantidade_produzida, 0) + v_boa,
           quantidade_refugada = coalesce(quantidade_refugada, 0) + v_refugo
     where id = p_programacao_id and empresa_id = v_empresa;
    if not found then raise exception 'Programação não encontrada na empresa autenticada; baixa não aplicada.'; end if;
  end if;

  return jsonb_build_object(
    'id', p_apontamento_id,
    'inicio_em', v_inicio,
    'fim_em', v_fim,
    'duracao_seg', greatest(extract(epoch from (v_fim - v_inicio)), 0),
    'quantidade_boa', v_boa,
    'quantidade_refugada', v_refugo,
    'ordem_producao_id', v_op,
    'programacao_id', p_programacao_id,
    'baixa_programacao', p_programacao_id is not null
  );
end;
$$;

comment on function public.erp_apontamento_finalizar is
  'Fecha o apontamento com horário do servidor e dá baixa em erp_pcp_programacoes na mesma transação.';

revoke all on function public.erp_apontamento_finalizar from anon;
revoke all on function public.erp_apontamento_finalizar from public;
grant execute on function public.erp_apontamento_finalizar to authenticated;
