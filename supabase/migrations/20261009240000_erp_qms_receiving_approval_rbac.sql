-- Harden receiving inspection decisions at the database boundary.
-- Direct BLOQUEAR calls are rejected so the UI must use the atomic quarantine + RPNC RPC.
create or replace function public.erp_qms_decidir_inspecao_recebimento(
  p_inspecao_id uuid,
  p_decisao text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_inspecao public.erp_qualidade_inspecoes_recebimento%rowtype;
  v_lote public.erp_estoque_lotes%rowtype;
  v_user uuid;
  v_master boolean;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória para decidir inspeção.';
  end if;

  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;

  v_master := coalesce(public.erp_is_master(), false);
  if not v_master and not coalesce(public.erp_has_permission('qualidade', 'aprovar'), false) then
    raise exception 'Permissão Qualidade/Aprovar necessária para decidir inspeção.';
  end if;

  if p_decisao <> 'APROVAR' then
    raise exception 'Reprovação deve usar o fluxo atômico de quarentena + RPNC.';
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
    raise exception 'Somente inspeção pendente pode ser aprovada.';
  end if;
  if v_inspecao.defeitos_encontrados > v_inspecao.criterio_ac
     or v_inspecao.defeitos_encontrados >= v_inspecao.criterio_re then
    raise exception 'Critério Ac/Re reprovado; use o fluxo de bloqueio com RPNC.';
  end if;

  select *
    into v_lote
  from public.erp_estoque_lotes
  where id = v_inspecao.lote_id
    and empresa_id = v_empresa
  for update;

  if not found then
    raise exception 'Lote da inspeção não encontrado na empresa atual.';
  end if;
  if upper(coalesce(v_lote.status_inspecao, '')) = 'RETIDO' then
    raise exception 'O lote já está retido; resolva a quarentena antes de aprovar.';
  end if;

  if not exists (
    select 1
    from public.erp_planos_inspecao s
    where s.empresa_id = v_empresa
      and s.produto_id = v_lote.produto_id
      and upper(s.tipo_inspecao) = 'RECEBIMENTO'
      and upper(coalesce(s.status, '')) = 'ATIVO'
      and s.aprovador_id is not null
      and s.aprovado_em is not null
      and (s.vigencia_inicio is null or s.vigencia_inicio <= current_date)
      and (s.vigencia_fim is null or s.vigencia_fim >= current_date)
  ) then
    raise exception 'Sem especificação de recebimento aprovada e vigente; lote não pode ser liberado.';
  end if;

  if exists (
    select 1
    from public.erp_planos_inspecao s
    where s.empresa_id = v_empresa
      and s.produto_id = v_lote.produto_id
      and upper(s.tipo_inspecao) = 'RECEBIMENTO'
      and upper(coalesce(s.status, '')) = 'ATIVO'
      and s.aprovador_id is not null
      and s.aprovado_em is not null
      and (s.vigencia_inicio is null or s.vigencia_inicio <= current_date)
      and (s.vigencia_fim is null or s.vigencia_fim >= current_date)
      and s.metodo_inspecao not in ('DIMENSIONAL', 'VISUAL')
  ) then
    raise exception 'Critérios funcionais/documentais exigem checklist de evidência dedicado antes da liberação.';
  end if;

  if exists (
    select 1
    from public.erp_planos_inspecao s
    where s.empresa_id = v_empresa
      and s.produto_id = v_lote.produto_id
      and upper(s.tipo_inspecao) = 'RECEBIMENTO'
      and upper(coalesce(s.status, '')) = 'ATIVO'
      and s.aprovador_id is not null
      and s.aprovado_em is not null
      and (s.vigencia_inicio is null or s.vigencia_inicio <= current_date)
      and (s.vigencia_fim is null or s.vigencia_fim >= current_date)
      and s.metodo_inspecao = 'DIMENSIONAL'
      and (
        s.nominal is null
        or s.limite_inferior is null
        or s.limite_superior is null
        or s.instrumento_id is null
        or not exists (
          select 1
          from public.erp_equipamentos_medicao i
          where i.id = s.instrumento_id
            and i.empresa_id = v_empresa
            and upper(i.status) = 'APROVADO'
            and i.proxima_calibracao >= current_date
        )
        or not exists (
          select 1
          from public.erp_qualidade_inspecoes_dimensionais m
          where m.empresa_id = v_empresa
            and m.inspecao_recebimento_id = v_inspecao.id
            and m.plano_inspecao_id = s.id
            and upper(coalesce(m.status, '')) = 'OK'
        )
      )
  ) then
    raise exception 'Há critério dimensional sem limites, instrumento vigente ou medição aprovada; lote não pode ser liberado.';
  end if;

  select usuario_id into v_user
  from public.erp_qms_current_user()
  limit 1;

  if v_user is null then
    raise exception 'Usuário ERP ativo não identificado para registrar a decisão.';
  end if;

  update public.erp_estoque_lotes
  set status_inspecao = 'APROVADO'
  where id = v_lote.id and empresa_id = v_empresa;

  if v_inspecao.lote_rastreabilidade_id is not null then
    update public.erp_estoque_lotes_rastreabilidade
    set status_qualidade = 'APROVADO'
    where id = v_inspecao.lote_rastreabilidade_id and empresa_id = v_empresa;
  end if;

  update public.erp_qualidade_inspecoes_recebimento
  set status = 'APROVADO', decidido_por = v_user, decidido_em = now(), updated_at = now()
  where id = v_inspecao.id and empresa_id = v_empresa;
end;
$$;

revoke all on function public.erp_qms_decidir_inspecao_recebimento(uuid, text) from public, anon;
grant execute on function public.erp_qms_decidir_inspecao_recebimento(uuid, text) to authenticated;
