-- Cumulative production postings and persisted machine rescheduling.
-- Existing callers keep their signature; the PCP screen can identify the exact scheduled program.
create or replace function public.erp_registrar_conferencia_producao_core(
  p_ordem_producao_id uuid,
  p_quantidade_encontrada numeric,
  p_quantidade_defeituosa numeric,
  p_defeitos jsonb,
  p_localizacao_destino_id uuid,
  p_acabamento boolean,
  p_observacao text,
  p_programacao_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_op record;
  v_conf uuid;
  v_boa numeric;
  v_acumulada numeric;
  v_saldo numeric;
  v_defeito jsonb;
  v_program public.erp_pcp_programacoes;
  v_machine_id uuid;
  v_program_id uuid;
  v_row public.erp_pcp_programacoes;
  v_cursor timestamptz;
  v_start timestamptz;
  v_end timestamptz;
  v_remaining numeric;
  v_daily_hours numeric;
  v_efficiency numeric;
  v_cycle numeric;
  v_cavities numeric;
  v_setup_hours numeric;
  v_run_hours numeric;
  v_duration_seconds numeric;
  v_rescheduled integer := 0;
begin
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque', 'editar')) then
    raise exception 'Sem permissão para registrar conferência de produção.';
  end if;
  if p_quantidade_encontrada is null
    or p_quantidade_defeituosa is null
    or p_quantidade_encontrada < 0
    or p_quantidade_defeituosa < 0
    or p_quantidade_defeituosa > p_quantidade_encontrada
    or p_quantidade_encontrada::text in ('NaN', 'Infinity', '-Infinity')
    or p_quantidade_defeituosa::text in ('NaN', 'Infinity', '-Infinity')
  then
    raise exception 'Quantidades de conferência inválidas';
  end if;
  if jsonb_typeof(coalesce(p_defeitos, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'Lista de defeitos inválida';
  end if;
  if p_localizacao_destino_id is not null and not exists (
    select 1 from public.erp_estoque_localizacoes l
    where l.id = p_localizacao_destino_id and l.empresa_id = v_empresa and l.ativo = true
  ) then
    raise exception 'Endereço de destino não pertence à empresa ativa.';
  end if;

  select * into v_op
  from public.erp_ordens_producao
  where id = p_ordem_producao_id and empresa_id = v_empresa
  for update;
  if not found then raise exception 'Ordem de produção não encontrada para a empresa atual'; end if;

  v_boa := p_quantidade_encontrada - p_quantidade_defeituosa;
  v_acumulada := coalesce(v_op.quantidade_produzida, 0) + p_quantidade_encontrada;
  v_saldo := greatest(coalesce(v_op.quantidade, 0) - v_acumulada, 0);

  if p_programacao_id is not null then
    select * into v_program
    from public.erp_pcp_programacoes p
    where p.id = p_programacao_id
      and p.empresa_id = v_empresa
      and p.ordem_producao_id = v_op.id
    for update;
    if not found then raise exception 'A programação selecionada não pertence à OP/empresa atual.'; end if;
    if lower(coalesce(v_program.status, '')) in ('cancelada','cancelado','concluída','concluida','concluído','concluido') then
      raise exception 'A programação selecionada já foi concluída ou cancelada.';
    end if;
  else
    select * into v_program
    from public.erp_pcp_programacoes p
    where p.empresa_id = v_empresa
      and p.ordem_producao_id = v_op.id
      and lower(coalesce(p.status, '')) not in ('cancelada','cancelado','concluída','concluida','concluído','concluido')
    order by p.inicio_planejado, p.id
    limit 1
    for update;
  end if;

  insert into public.erp_producao_conferencias (
    empresa_id, ordem_producao_id, produto_id, quantidade_planejada, quantidade_encontrada,
    quantidade_defeituosa, quantidade_lancada_estoque, quantidade_lancada_refugo, status,
    acabamento, observacao, conferido_por
  ) values (
    v_empresa, v_op.id, v_op.produto_id, v_op.quantidade, p_quantidade_encontrada,
    p_quantidade_defeituosa, v_boa, p_quantidade_defeituosa, 'conferida',
    p_acabamento, p_observacao,
    (select u.id from public.erp_usuarios u where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa limit 1)
  ) returning id into v_conf;

  for v_defeito in select value from jsonb_array_elements(coalesce(p_defeitos, '[]'::jsonb))
  loop
    if coalesce(btrim(v_defeito->>'defeito'), '') = '' then continue; end if;
    insert into public.erp_producao_defeitos (
      empresa_id, conferencia_id, ordem_producao_id, produto_id, defeito, quantidade,
      observacao, encaminhado_qualidade
    ) values (
      v_empresa, v_conf, v_op.id, v_op.produto_id, btrim(v_defeito->>'defeito'),
      greatest(0, coalesce(nullif(v_defeito->>'quantidade', '')::numeric, 0)),
      nullif(btrim(v_defeito->>'observacao'), ''), true
    );
  end loop;

  if v_boa > 0 then
    insert into public.erp_estoque_movimentos (
      empresa_id, produto_id, tipo, quantidade, origem, documento, ordem_producao_id,
      localizacao_destino_id, observacao
    ) values (
      v_empresa, v_op.produto_id, 'entrada', v_boa, 'producao', v_op.numero_op,
      v_op.id, p_localizacao_destino_id, 'Conferência de produção: quantidade boa'
    );
  end if;
  if p_quantidade_defeituosa > 0 then
    insert into public.erp_estoque_movimentos (
      empresa_id, produto_id, tipo, quantidade, origem, documento, ordem_producao_id, observacao
    ) values (
      v_empresa, v_op.produto_id, 'refugo', p_quantidade_defeituosa, 'producao',
      v_op.numero_op, v_op.id, 'Conferência de produção: refugo encaminhado à qualidade'
    );
  end if;

  update public.erp_ordens_producao
  set quantidade_produzida = v_acumulada,
      status = case
        when v_acumulada >= coalesce(v_op.quantidade, 0) then 'concluida'
        when v_acumulada > 0 then 'parcial'
        else v_op.status
      end
  where id = v_op.id and empresa_id = v_empresa;

  if v_program.id is not null then
    update public.erp_pcp_programacoes
    set quantidade_produzida = coalesce(quantidade_produzida, 0) + p_quantidade_encontrada,
        quantidade_refugada = coalesce(quantidade_refugada, 0) + p_quantidade_defeituosa,
        status = case
          when coalesce(quantidade_produzida, 0) + p_quantidade_encontrada >= coalesce(quantidade_planejada, 0) then 'Concluída'
          when coalesce(quantidade_produzida, 0) + p_quantidade_encontrada > 0 then 'Em andamento'
          else status
        end
    where id = v_program.id and empresa_id = v_empresa
    returning maquina_id into v_machine_id;
    v_program_id := v_program.id;

    if v_machine_id is not null then
      v_cursor := null;
      for v_row in
        select p.*
        from public.erp_pcp_programacoes p
        where p.empresa_id = v_empresa
          and p.maquina_id = v_machine_id
          and (
            p.id = v_program_id
            or lower(coalesce(p.status, '')) not in ('cancelada','cancelado','concluída','concluida','concluído','concluido')
          )
        order by p.inicio_planejado, p.id
        for update
      loop
        v_remaining := greatest(coalesce(v_row.quantidade_planejada, 0) - coalesce(v_row.quantidade_produzida, 0), 0);
        if v_row.id = v_program_id and v_remaining <= 0 then
          update public.erp_pcp_programacoes
          set fim_planejado = greatest(now(), inicio_planejado), status = 'Concluída'
          where id = v_row.id and empresa_id = v_empresa;
          v_cursor := greatest(now(), v_row.inicio_planejado);
          v_rescheduled := v_rescheduled + 1;
          continue;
        end if;

        if v_remaining <= 0 then continue; end if;

        v_start := v_row.inicio_planejado;
        if v_cursor is not null then v_start := greatest(v_start, v_cursor); end if;
        if v_start <= now() then v_start := greatest(v_start, now()); end if;

        v_daily_hours := greatest(0.5, coalesce(v_row.turnos, 1) * coalesce(v_row.horas_turno, 8));
        v_efficiency := greatest(0.01, least(1, coalesce(v_row.eficiencia_percent, 85) / 100.0));
        v_cycle := greatest(0, coalesce(v_row.ciclo_seg, 0));
        v_cavities := greatest(1, coalesce(v_row.cavidades_ativas, 1));
        v_setup_hours := case when coalesce(v_row.quantidade_produzida, 0) > 0 then 0 else greatest(0, coalesce(v_row.setup_min, 0)) / 60.0 end;

        if v_cycle > 0 then
          v_run_hours := (v_remaining * v_cycle / v_cavities / 3600.0 / v_efficiency) + v_setup_hours;
          v_duration_seconds := (v_run_hours / v_daily_hours) * 86400.0;
        else
          v_duration_seconds := greatest(0, extract(epoch from (v_row.fim_planejado - v_row.inicio_planejado)));
        end if;
        v_end := v_start + make_interval(secs => greatest(60, v_duration_seconds)::double precision);

        update public.erp_pcp_programacoes
        set inicio_planejado = v_start,
            fim_planejado = v_end
        where id = v_row.id and empresa_id = v_empresa;
        v_cursor := v_end;
        v_rescheduled := v_rescheduled + 1;
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'conferencia_id', v_conf,
    'ordem_producao_id', v_op.id,
    'numero_op', v_op.numero_op,
    'quantidade_planejada', v_op.quantidade,
    'quantidade_encontrada', p_quantidade_encontrada,
    'quantidade_defeituosa', p_quantidade_defeituosa,
    'quantidade_boa', v_boa,
    'quantidade_produzida_acumulada', v_acumulada,
    'saldo_producao', v_saldo,
    'programacao_id', v_program_id,
    'programacoes_recalculadas', v_rescheduled
  );
end;
$function$;

create or replace function public.erp_registrar_conferencia_producao(
  p_ordem_producao_id uuid,
  p_quantidade_encontrada numeric,
  p_quantidade_defeituosa numeric,
  p_defeitos jsonb default '[]'::jsonb,
  p_localizacao_destino_id uuid default null::uuid,
  p_acabamento boolean default false,
  p_observacao text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  return public.erp_registrar_conferencia_producao_core(
    p_ordem_producao_id, p_quantidade_encontrada, p_quantidade_defeituosa,
    coalesce(p_defeitos, '[]'::jsonb), p_localizacao_destino_id,
    coalesce(p_acabamento, false), p_observacao, null
  );
end;
$function$;

create or replace function public.erp_pcp_registrar_conferencia_producao(
  p_ordem_producao_id uuid,
  p_programacao_id uuid,
  p_quantidade_encontrada numeric,
  p_quantidade_defeituosa numeric,
  p_defeitos jsonb default '[]'::jsonb,
  p_localizacao_destino_id uuid default null::uuid,
  p_acabamento boolean default false,
  p_observacao text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  return public.erp_registrar_conferencia_producao_core(
    p_ordem_producao_id, p_quantidade_encontrada, p_quantidade_defeituosa,
    coalesce(p_defeitos, '[]'::jsonb), p_localizacao_destino_id,
    coalesce(p_acabamento, false), p_observacao, p_programacao_id
  );
end;
$function$;

revoke all on function public.erp_registrar_conferencia_producao_core(uuid,numeric,numeric,jsonb,uuid,boolean,text,uuid) from public, anon, authenticated;
revoke execute on function public.erp_registrar_conferencia_producao(uuid,numeric,numeric,jsonb,uuid,boolean,text) from public, anon;
revoke execute on function public.erp_pcp_registrar_conferencia_producao(uuid,uuid,numeric,numeric,jsonb,uuid,boolean,text) from public, anon;
grant execute on function public.erp_registrar_conferencia_producao(uuid,numeric,numeric,jsonb,uuid,boolean,text) to authenticated;
grant execute on function public.erp_pcp_registrar_conferencia_producao(uuid,uuid,numeric,numeric,jsonb,uuid,boolean,text) to authenticated;
