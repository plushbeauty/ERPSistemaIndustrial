begin;

create or replace function public.erp_sgq_abrir_rpnc(
  p_descricao text,
  p_origem text,
  p_severidade text,
  p_setor_id uuid default null,
  p_linked_entity_type text default null,
  p_linked_entity_id uuid default null
) returns public.erp_rpnc
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_numero bigint;
  v_result public.erp_rpnc;
begin
  if v_empresa is null then raise exception 'Empresa não identificada.'; end if;
  if not public.erp_has_permission('qualidade', 'criar') then raise exception 'Sem permissão para abrir RPNC.'; end if;
  if nullif(btrim(p_descricao), '') is null or nullif(btrim(p_origem), '') is null then
    raise exception 'Descrição e origem são obrigatórias.';
  end if;
  if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then
    raise exception 'Gravidade inválida.';
  end if;
  if p_setor_id is null or not exists (
    select 1 from public.erp_setores s
    where s.id = p_setor_id and s.empresa_id = v_empresa and s.ativo = true
  ) then raise exception 'Setor inválido para a empresa.'; end if;
  if lower(coalesce(btrim(p_linked_entity_type), '')) = 'lote' then
    if p_linked_entity_id is null or not exists (
      select 1 from public.erp_estoque_lotes l
      where l.id = p_linked_entity_id and l.empresa_id = v_empresa
      for update
    ) then
      raise exception 'O lote vinculado não pertence à empresa ativa.';
    end if;
  end if;

  select u.id into v_usuario
  from public.erp_usuarios u
  where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa
    and u.ativo = true and u.deleted_at is null
  limit 1;
  if v_usuario is null then raise exception 'Usuário ERP ativo não identificado.'; end if;

  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
  values (v_empresa, 'RPNC-' || to_char(current_date, 'YYYY'), 1)
  on conflict (empresa_id, chave)
  do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
  returning proximo_valor into v_numero;

  while exists (
    select 1 from public.erp_rpnc
    where empresa_id = v_empresa
      and numero_rpnc = 'RPNC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_numero::text, 6, '0')
  ) loop
    update public.erp_sgq_contadores
    set proximo_valor = proximo_valor + 1
    where empresa_id = v_empresa and chave = 'RPNC-' || to_char(current_date, 'YYYY')
    returning proximo_valor - 1 into v_numero;
  end loop;

  perform set_config('app.sgq_rpnc_open', 'open', true);
  insert into public.erp_rpnc (
    empresa_id, numero_rpnc, descricao_nao_conformidade, status, acao_corretiva,
    sgq_origem, sgq_severidade, setor_id, sgq_vinculo_tipo, sgq_vinculo_id, sgq_aberto_por
  ) values (
    v_empresa,
    'RPNC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_numero::text, 6, '0'),
    btrim(p_descricao), 'aberta', btrim(p_descricao), btrim(p_origem), p_severidade,
    p_setor_id, nullif(btrim(p_linked_entity_type), ''), p_linked_entity_id, v_usuario
  ) returning * into v_result;

  if lower(coalesce(btrim(p_linked_entity_type), '')) = 'lote' then
    perform public.erp_reter_lote(
      p_linked_entity_id,
      'RPNC ' || v_result.numero_rpnc || ': ' || left(btrim(p_descricao), 180)
    );
  end if;

  return v_result;
end
$$;

revoke all on function public.erp_sgq_abrir_rpnc(text,text,text,uuid,text,uuid) from public, anon;
grant execute on function public.erp_sgq_abrir_rpnc(text,text,text,uuid,text,uuid) to authenticated;

commit;
