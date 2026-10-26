begin;

-- Extends the existing RPNC row so report fields, repeated lots, 5-Why chains,
-- team members, action plans and closure data stay with the tenant-scoped record.
alter table public.erp_rpnc
  add column if not exists sgq_tratamento_anomalia jsonb not null default '{}'::jsonb;

alter table public.erp_rpnc
  drop constraint if exists erp_rpnc_sgq_tratamento_anomalia_object_ck;

alter table public.erp_rpnc
  add constraint erp_rpnc_sgq_tratamento_anomalia_object_ck
  check (jsonb_typeof(sgq_tratamento_anomalia) = 'object');

comment on column public.erp_rpnc.sgq_tratamento_anomalia is
  'Campos estruturados do formulário de tratamento de anomalia e RPNC; protegido pelas políticas da linha ERP existente.';

-- Retains multiple stock lots in one RPNC using the established transactional
-- erp_reter_lote routine. Any invalid lot aborts the whole operation.
create or replace function public.erp_rpnc_reter_lotes(
  p_rpnc_id uuid,
  p_lote_ids uuid[],
  p_motivo text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_rpnc public.erp_rpnc%rowtype;
  v_lote_id uuid;
  v_lote_empresa uuid;
  v_lote_interno text;
  v_lote_fornecedor text;
  v_reter integer := 0;
  v_ja_retidos integer := 0;
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_lotes jsonb;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.' using errcode = '28000';
  end if;
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.' using errcode = '42501';
  end if;
  if not public.erp_has_permission('qualidade', 'editar') then
    raise exception 'Seu perfil não pode bloquear lotes nesta RPNC.' using errcode = '42501';
  end if;
  if p_lote_ids is null or cardinality(p_lote_ids) = 0 then
    raise exception 'Selecione ao menos um lote da RPNC.' using errcode = '22023';
  end if;
  if cardinality(p_lote_ids) > 50 then
    raise exception 'Uma RPNC pode reter até 50 lotes por operação.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_lote_ids) as requested(lote_id) where requested.lote_id is null)
     or (select count(distinct requested.lote_id) from unnest(p_lote_ids) as requested(lote_id)) <> cardinality(p_lote_ids) then
    raise exception 'A seleção contém lote vazio ou duplicado.' using errcode = '22023';
  end if;
  if length(v_motivo) < 5 then
    raise exception 'Informe o motivo técnico da retenção.' using errcode = '22023';
  end if;

  select * into v_rpnc
  from public.erp_rpnc
  where id = p_rpnc_id and empresa_id = v_empresa
  for update;
  if not found then
    raise exception 'RPNC não encontrada na empresa atual.' using errcode = 'P0002';
  end if;

  v_lotes := case
    when jsonb_typeof(v_rpnc.sgq_tratamento_anomalia -> 'lots') = 'array'
      then v_rpnc.sgq_tratamento_anomalia -> 'lots'
    else '[]'::jsonb
  end;

  -- Validate every lot and its membership in this RPNC before retaining any.
  for v_lote_id in
    select requested.lote_id
    from unnest(p_lote_ids) as requested(lote_id)
    order by requested.lote_id
  loop
    select l.empresa_id, l.lote_interno, l.lote_fornecedor
      into v_lote_empresa, v_lote_interno, v_lote_fornecedor
    from public.erp_estoque_lotes l
    where l.id = v_lote_id
    for update;

    if v_lote_empresa is distinct from v_empresa then
      raise exception 'Um dos lotes não pertence à empresa da sessão.' using errcode = '42501';
    end if;
    if not exists (
      select 1
      from jsonb_array_elements(v_lotes) as report_lot(value)
      where upper(trim(coalesce(report_lot.value ->> 'code', ''))) in (
        upper(trim(coalesce(v_lote_interno, ''))),
        upper(trim(coalesce(v_lote_fornecedor, '')))
      )
    ) then
      raise exception 'Um dos lotes não consta no relatório desta RPNC.' using errcode = '22023';
    end if;
    if exists (
      select 1
      from public.erp_quarentenas_lotes q
      where q.empresa_id = v_empresa
        and q.lote_id = v_lote_id
        and q.status = 'RETIDO'
        and q.motivo <> v_motivo
    ) then
      raise exception 'Um dos lotes já está retido por outra tratativa.' using errcode = '23505';
    end if;
  end loop;

  for v_lote_id in
    select requested.lote_id
    from unnest(p_lote_ids) as requested(lote_id)
    order by requested.lote_id
  loop
    if exists (
      select 1 from public.erp_quarentenas_lotes q
      where q.empresa_id = v_empresa
        and q.lote_id = v_lote_id
        and q.status = 'RETIDO'
        and q.motivo = v_motivo
    ) then
      v_ja_retidos := v_ja_retidos + 1;
    else
      perform public.erp_reter_lote(v_lote_id, v_motivo);
      v_reter := v_reter + 1;
    end if;
  end loop;

  update public.erp_rpnc
  set bloqueia_lote = true
  where id = p_rpnc_id and empresa_id = v_empresa;

  return jsonb_build_object(
    'rpnc_id', p_rpnc_id,
    'retidos_nesta_operacao', v_reter,
    'ja_retidos_por_esta_rpnc', v_ja_retidos,
    'total_lotes', cardinality(p_lote_ids),
    'status', 'EM_QUARENTENA'
  );
end;
$function$;

revoke all on function public.erp_rpnc_reter_lotes(uuid, uuid[], text) from public, anon;
grant execute on function public.erp_rpnc_reter_lotes(uuid, uuid[], text) to authenticated;

commit;
