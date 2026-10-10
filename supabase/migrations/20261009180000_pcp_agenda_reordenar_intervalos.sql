begin;
create or replace function public.erp_pcp_reordenar_agenda_maquinas(p_agenda_id uuid, p_vizinha_id uuid)
returns void
language plpgsql
security invoker
set search_path=public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_a public.pcp_agenda_maquinas%rowtype;
  v_b public.pcp_agenda_maquinas%rowtype;
  v_temp_start timestamptz;
  v_temp_end timestamptz;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada'; end if;
  if p_agenda_id = p_vizinha_id then raise exception 'Selecione duas programações distintas'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_empresa::text,0));
  select * into v_a from public.pcp_agenda_maquinas
   where id=p_agenda_id and empresa_id=v_empresa for update;
  select * into v_b from public.pcp_agenda_maquinas
   where id=p_vizinha_id and empresa_id=v_empresa for update;
  if v_a.id is null or v_b.id is null then raise exception 'Programação não encontrada na empresa'; end if;
  if v_a.maquina_id <> v_b.maquina_id or v_a.data_hora_inicio::date <> v_b.data_hora_inicio::date then
    raise exception 'Reordenação permitida somente na mesma máquina e no mesmo dia';
  end if;
  if v_a.status not in ('planejada','confirmada') or v_b.status not in ('planejada','confirmada') then
    raise exception 'Somente programações planejadas/confirmadas podem ser reordenadas';
  end if;
  if v_a.data_hora_inicio < v_b.data_hora_inicio then
    v_temp_start := greatest(v_a.data_hora_fim,v_b.data_hora_fim) + interval '1 day';
    v_temp_end := v_temp_start + (v_a.data_hora_fim-v_a.data_hora_inicio);
    update public.pcp_agenda_maquinas set data_hora_inicio=v_temp_start,data_hora_fim=v_temp_end where id=v_a.id;
    update public.pcp_agenda_maquinas set data_hora_inicio=v_a.data_hora_inicio,data_hora_fim=v_a.data_hora_fim where id=v_b.id;
    update public.pcp_agenda_maquinas set data_hora_inicio=v_b.data_hora_inicio,data_hora_fim=v_b.data_hora_fim where id=v_a.id;
  else
    v_temp_start := greatest(v_a.data_hora_fim,v_b.data_hora_fim) + interval '1 day';
    v_temp_end := v_temp_start + (v_a.data_hora_fim-v_a.data_hora_inicio);
    update public.pcp_agenda_maquinas set data_hora_inicio=v_temp_start,data_hora_fim=v_temp_end where id=v_a.id;
    update public.pcp_agenda_maquinas set data_hora_inicio=v_a.data_hora_inicio,data_hora_fim=v_a.data_hora_fim where id=v_b.id;
    update public.pcp_agenda_maquinas set data_hora_inicio=v_b.data_hora_inicio,data_hora_fim=v_b.data_hora_fim where id=v_a.id;
  end if;
end;
$$;
revoke all on function public.erp_pcp_reordenar_agenda_maquinas(uuid,uuid) from public;
grant execute on function public.erp_pcp_reordenar_agenda_maquinas(uuid,uuid) to authenticated;
commit;
