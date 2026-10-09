-- Formal Quality approval for specification master data.
-- Active criteria are immutable; changes are made as a new revision and approved by an authorized user.
create or replace function public.erp_guard_erp_planos_inspecao_approval()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.status, 'rascunho') = 'ativo'
       and coalesce(current_setting('app.erp_spec_approval', true), '') <> 'approval' then
      raise exception 'Nova especificação deve iniciar em rascunho e passar pela aprovação formal da Qualidade.';
    end if;
    return new;
  end if;

  if coalesce(current_setting('app.erp_spec_approval', true), '') <> 'approval' then
    if new.status = 'ativo' and old.status is distinct from new.status then
      raise exception 'Ativação de especificação só pode ocorrer pelo fluxo formal de aprovação.';
    end if;
    if new.status = 'inativo' and old.status = 'ativo' then
      raise exception 'Inativação de especificação ativa exige permissão formal da Qualidade.';
    end if;
    if old.status = 'ativo' and (
      new.empresa_id is distinct from old.empresa_id
      or new.produto_id is distinct from old.produto_id
      or new.codigo is distinct from old.codigo
      or new.caracteristica is distinct from old.caracteristica
      or new.unidade is distinct from old.unidade
      or new.nominal is distinct from old.nominal
      or new.limite_inferior is distinct from old.limite_inferior
      or new.limite_superior is distinct from old.limite_superior
      or new.frequencia is distinct from old.frequencia
      or new.grupo_material is distinct from old.grupo_material
      or new.tipo_inspecao is distinct from old.tipo_inspecao
      or new.metodo_inspecao is distinct from old.metodo_inspecao
      or new.condicao_armazenamento is distinct from old.condicao_armazenamento
      or new.instrumento_id is distinct from old.instrumento_id
      or new.revisao is distinct from old.revisao
      or new.vigencia_inicio is distinct from old.vigencia_inicio
      or new.vigencia_fim is distinct from old.vigencia_fim
      or new.responsavel_id is distinct from old.responsavel_id
      or new.aprovador_id is distinct from old.aprovador_id
      or new.aprovado_em is distinct from old.aprovado_em
    ) then
      raise exception 'Especificação ativa é imutável. Crie uma nova revisão para alterar critérios.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_guard_planos_inspecao_approval on public.erp_planos_inspecao;
create trigger trg_erp_guard_planos_inspecao_approval
before insert or update on public.erp_planos_inspecao
for each row execute function public.erp_guard_erp_planos_inspecao_approval();

create or replace function public.erp_qualidade_aprovar_especificacao(p_especificacao_id uuid)
returns public.erp_planos_inspecao
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_spec public.erp_planos_inspecao;
  v_instrument public.erp_equipamentos_medicao;
begin
  if not public.erp_is_master() and not public.erp_has_permission('qualidade', 'aprovar') then
    raise exception 'Sem permissão para aprovar especificações técnicas.';
  end if;

  select p.* into v_spec
  from public.erp_planos_inspecao p
  where p.id = p_especificacao_id
    and (public.erp_is_master() or p.empresa_id = v_empresa)
  for update;

  if not found then raise exception 'Especificação não encontrada na empresa autorizada.'; end if;
  if v_spec.status = 'ativo' and v_spec.aprovado_em is not null then
    raise exception 'Esta revisão já está aprovada e ativa. Crie uma nova revisão para alterar os critérios.';
  end if;
  if coalesce(trim(v_spec.codigo), '') = '' or coalesce(trim(v_spec.caracteristica), '') = '' then
    raise exception 'Código e característica são obrigatórios.';
  end if;
  if v_spec.vigencia_inicio is not null and v_spec.vigencia_fim is not null and v_spec.vigencia_fim < v_spec.vigencia_inicio then
    raise exception 'A vigência final não pode anteceder a vigência inicial.';
  end if;
  if v_spec.vigencia_fim is not null and v_spec.vigencia_fim < current_date then
    raise exception 'Não é possível aprovar uma especificação com vigência encerrada.';
  end if;

  if v_spec.metodo_inspecao not in ('VISUAL', 'DOCUMENTAL') then
    if v_spec.nominal is null or (v_spec.limite_inferior is null and v_spec.limite_superior is null) then
      raise exception 'Critério dimensional/funcional exige nominal e pelo menos um limite técnico.';
    end if;
    if v_spec.limite_inferior is not null and v_spec.nominal < v_spec.limite_inferior then
      raise exception 'O nominal está abaixo do limite inferior.';
    end if;
    if v_spec.limite_superior is not null and v_spec.nominal > v_spec.limite_superior then
      raise exception 'O nominal está acima do limite superior.';
    end if;
    if v_spec.instrumento_id is null then raise exception 'Selecione um instrumento de medição calibrado.'; end if;
    select i.* into v_instrument
    from public.erp_equipamentos_medicao i
    where i.id = v_spec.instrumento_id
      and i.empresa_id = v_spec.empresa_id
      and upper(i.status) = 'APROVADO'
      and i.proxima_calibracao >= current_date;
    if not found then raise exception 'O instrumento precisa estar aprovado e com calibração vigente.'; end if;
  end if;

  if v_spec.responsavel_id is null then raise exception 'Defina o responsável técnico pela especificação.'; end if;

  perform set_config('app.erp_spec_approval', 'approval', true);
  update public.erp_planos_inspecao
  set status = 'inativo'
  where empresa_id = v_spec.empresa_id
    and produto_id = v_spec.produto_id
    and codigo = v_spec.codigo
    and tipo_inspecao = v_spec.tipo_inspecao
    and status = 'ativo'
    and id <> v_spec.id;

  update public.erp_planos_inspecao
  set status = 'ativo', aprovador_id = auth.uid(), aprovado_em = now()
  where id = v_spec.id and empresa_id = v_spec.empresa_id
  returning * into v_spec;

  return v_spec;
end;
$$;

create or replace function public.erp_qualidade_inativar_especificacao(p_especificacao_id uuid)
returns public.erp_planos_inspecao
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_spec public.erp_planos_inspecao;
begin
  if not public.erp_is_master() and not public.erp_has_permission('qualidade', 'aprovar') then
    raise exception 'Sem permissão para inativar especificações técnicas.';
  end if;

  select p.* into v_spec
  from public.erp_planos_inspecao p
  where p.id = p_especificacao_id
    and (public.erp_is_master() or p.empresa_id = v_empresa)
  for update;
  if not found then raise exception 'Especificação não encontrada na empresa autorizada.'; end if;
  if v_spec.status <> 'ativo' then raise exception 'Somente especificações ativas podem ser inativadas por este fluxo.'; end if;

  perform set_config('app.erp_spec_approval', 'approval', true);
  update public.erp_planos_inspecao
  set status = 'inativo'
  where id = v_spec.id and empresa_id = v_spec.empresa_id
  returning * into v_spec;
  return v_spec;
end;
$$;

revoke all on function public.erp_guard_erp_planos_inspecao_approval() from public, anon, authenticated;
revoke all on function public.erp_qualidade_aprovar_especificacao(uuid) from public, anon;
grant execute on function public.erp_qualidade_aprovar_especificacao(uuid) to authenticated;
revoke all on function public.erp_qualidade_inativar_especificacao(uuid) from public, anon;
grant execute on function public.erp_qualidade_inativar_especificacao(uuid) to authenticated;
