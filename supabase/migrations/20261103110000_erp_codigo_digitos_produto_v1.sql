-- 20261103110000_erp_codigo_digitos_produto_v1.sql
-- Tela "Regras do código" (ParametrosCodigo) e "Ficha técnica" (FormFichaTecnica) deixam o usuário
-- escolher quantas casas tem a sequência do SKU (digitos_produto, limitado a 3..6 na interface), mas a
-- tabela criada em 20260928200000_erp_config_codificacao_areas_historico_rbac_alignment.sql não tem a
-- coluna e a função erp_gerar_codigo (20260928200100) grava sempre 4 casas. As telas consultavam uma
-- coluna inexistente, então a consulta falhava e a numeração saía diferente do que o usuário ajustou.
-- Corpo da função mantido idêntico ao do repo; muda apenas o lpad, que passa a respeitar a configuração.

begin;

alter table public.erp_codigos
  add column if not exists digitos_produto integer not null default 4 check (digitos_produto between 3 and 6);

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
  v_digitos integer;
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
  v_digitos := coalesce(nullif(v_config.digitos_produto, 0), 4);

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
    v_code := lpad(v_seq::text, v_digitos, '0');
  else
    v_code := v_base || v_sep || lpad(v_seq::text, v_digitos, '0');
  end if;

  insert into public.erp_historico_codigos(empresa_id,codigo_completo,codigo_base,sequencia,gerado_por)
  values(v_empresa_id,v_code,v_base,v_seq,v_uid);

  update public.erp_codigos
  set sequencia_atual = greatest(sequencia_atual,v_seq), updated_at = now()
  where id = p_config_id;

  return v_code;
end;
$$;

revoke execute on function public.erp_gerar_codigo(uuid, text) from public, anon;
grant execute on function public.erp_gerar_codigo(uuid, text) to authenticated;

commit;
