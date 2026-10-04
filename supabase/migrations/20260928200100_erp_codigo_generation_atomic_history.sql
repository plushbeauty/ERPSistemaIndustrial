create or replace function public.erp_gerar_codigo(
  p_config_id uuid,
  p_grupo_codigo text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_empresa_id uuid;
  v_prefixo text;
  v_sep text;
  v_modo text;
  v_seq integer;
  v_base text;
  v_code text;
  v_config public.erp_codigos%rowtype;
begin
  if v_uid is null then raise exception 'Sessão não autenticada'; end if;

  select u.empresa_id into v_empresa_id
  from public.erp_usuarios u
  where u.auth_user_id = v_uid and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_empresa_id is null then raise exception 'Usuário sem empresa vinculada'; end if;

  select * into v_config
  from public.erp_codigos
  where id = p_config_id and empresa_id = v_empresa_id
  for update;

  if not found then raise exception 'Configuração de código não encontrada para a empresa'; end if;

  v_prefixo := upper(trim(v_config.prefixo));
  v_sep := coalesce(v_config.separador, '');
  v_modo := upper(trim(v_config.modo_numeracao));

  if v_modo = 'PGR' then
    if nullif(trim(coalesce(p_grupo_codigo,'')), '') is null then
      raise exception 'Grupo é obrigatório para o modo prefixo + grupo + sequência';
    end if;
    v_base := v_prefixo || v_sep || upper(trim(p_grupo_codigo));
  elsif v_modo = 'PS' then
    v_base := v_prefixo;
  elsif v_modo = 'NUM' then
    v_base := '';
  else
    raise exception 'Modo de numeração inválido: %', v_modo;
  end if;

  select coalesce(max(h.sequencia),0)::integer + 1 into v_seq
  from public.erp_historico_codigos h
  where h.empresa_id = v_empresa_id and h.codigo_base = v_base;

  if v_modo = 'NUM' then
    v_code := lpad(v_seq::text, 4, '0');
  else
    v_code := v_base || v_sep || lpad(v_seq::text, 4, '0');
  end if;

  insert into public.erp_historico_codigos(empresa_id,codigo_completo,codigo_base,sequencia,gerado_por)
  values(v_empresa_id,v_code,v_base,v_seq,v_uid);

  update public.erp_codigos
  set sequencia_atual = greatest(sequencia_atual,v_seq), updated_at=now()
  where id=p_config_id;

  return v_code;
end;
$$;

revoke execute on function public.erp_gerar_codigo(uuid,text) from public, anon;
grant execute on function public.erp_gerar_codigo(uuid,text) to authenticated;
