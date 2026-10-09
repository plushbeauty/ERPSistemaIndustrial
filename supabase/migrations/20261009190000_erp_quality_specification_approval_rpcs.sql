-- Formal approval/inactivation for quality specification master records.
-- Permission and tenant checks are performed inside PostgreSQL, not only in the UI.
create or replace function public.erp_qualidade_aprovar_especificacao(p_especificacao_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_user uuid;
  v_spec public.erp_planos_inspecao%rowtype;
  v_is_master boolean;
  v_can_approve boolean;
  v_instrument_ok boolean;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'Sessão autenticada obrigatória para aprovar especificação.';
  end if;

  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;

  select * into v_spec
  from public.erp_planos_inspecao
  where id = p_especificacao_id and empresa_id = v_empresa
  for update;

  if not found then
    raise exception 'Especificação não encontrada na empresa atual.';
  end if;

  v_is_master := coalesce(public.erp_is_master(), false);
  v_can_approve := coalesce(public.erp_has_permission(p_modulo => 'qualidade', p_acao => 'aprovar'), false);
  if not v_is_master and not v_can_approve then
    raise exception 'Permissão Qualidade/Aprovar necessária.';
  end if;

  if v_spec.aprovador_id is null or v_spec.aprovador_id <> v_user then
    raise exception 'Somente o aprovador designado pode aprovar esta revisão.';
  end if;
  if v_spec.responsavel_id is null then
    raise exception 'A especificação precisa ter responsável designado antes da aprovação.';
  end if;
  if not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = v_spec.responsavel_id
      and u.empresa_id = v_empresa
      and u.ativo = true
  ) then
    raise exception 'O responsável deve ser usuário ativo da empresa atual.';
  end if;
  if not exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = v_spec.aprovador_id
      and u.empresa_id = v_empresa
      and u.ativo = true
  ) then
    raise exception 'O aprovador deve ser usuário ativo da empresa atual.';
  end if;

  if v_spec.vigencia_inicio is not null and v_spec.vigencia_inicio > current_date then
    raise exception 'A vigência da especificação ainda não começou.';
  end if;
  if v_spec.vigencia_fim is not null and v_spec.vigencia_fim < current_date then
    raise exception 'A vigência da especificação expirou.';
  end if;

  if v_spec.metodo_inspecao in ('DIMENSIONAL', 'FUNCIONAL') then
    if v_spec.limite_inferior is null or v_spec.limite_superior is null or v_spec.nominal is null then
      raise exception 'Especificação dimensional/funcional exige nominal e limites inferior/superior.';
    end if;
    if v_spec.instrumento_id is null then
      raise exception 'Especificação dimensional/funcional exige instrumento de medição.';
    end if;
    select exists (
      select 1 from public.erp_equipamentos_medicao i
      where i.id = v_spec.instrumento_id
        and i.empresa_id = v_empresa
        and upper(i.status) = 'APROVADO'
        and i.proxima_calibracao >= current_date
    ) into v_instrument_ok;
    if not v_instrument_ok then
      raise exception 'O instrumento deve estar aprovado e com calibração vigente.';
    end if;
  end if;

  update public.erp_planos_inspecao
  set status = 'ativo', aprovado_em = now()
  where id = v_spec.id and empresa_id = v_empresa;
end;
$$;

create or replace function public.erp_qualidade_inativar_especificacao(p_especificacao_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_is_master boolean;
  v_can_approve boolean;
begin
  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null or auth.uid() is null then
    raise exception 'Sessão autenticada e empresa atual são obrigatórias.';
  end if;

  v_is_master := coalesce(public.erp_is_master(), false);
  v_can_approve := coalesce(public.erp_has_permission(p_modulo => 'qualidade', p_acao => 'aprovar'), false);
  if not v_is_master and not v_can_approve then
    raise exception 'Permissão Qualidade/Aprovar necessária para inativar especificação.';
  end if;

  update public.erp_planos_inspecao
  set status = 'inativo'
  where id = p_especificacao_id and empresa_id = v_empresa and lower(status) = 'ativo';

  if not found then
    raise exception 'Especificação ativa não encontrada na empresa atual.';
  end if;
end;
$$;

revoke all on function public.erp_qualidade_aprovar_especificacao(uuid) from public, anon;
revoke all on function public.erp_qualidade_inativar_especificacao(uuid) from public, anon;
grant execute on function public.erp_qualidade_aprovar_especificacao(uuid) to authenticated;
grant execute on function public.erp_qualidade_inativar_especificacao(uuid) to authenticated;
