-- Cadastro de produtos: prefixo configurável por grupo e parâmetros condicionais de processo.
alter table public.erp_grupos
  add column if not exists prefixo_codigo text;

alter table public.erp_produtos
  add column if not exists grupo_id uuid references public.erp_grupos(id) on delete set null,
  add column if not exists foto_molde_url text,
  add column if not exists peso_injecao numeric,
  add column if not exists peso_peca numeric,
  add column if not exists cor_peca text,
  add column if not exists resina_tipo text,
  add column if not exists cor_resina text,
  add column if not exists temp_bico_padrao numeric,
  add column if not exists tempo_ciclo_padrao numeric;

create index if not exists idx_erp_produtos_empresa_grupo
  on public.erp_produtos (empresa_id, grupo_id);

create unique index if not exists uq_erp_grupos_empresa_prefixo_codigo
  on public.erp_grupos (empresa_id, prefixo_codigo)
  where prefixo_codigo is not null and btrim(prefixo_codigo) <> '';

-- Prefixos iniciais editáveis pelo usuário; Cabos mantém o exemplo solicitado (2).
update public.erp_grupos
set prefixo_codigo = case
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'prens%' then '1'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'cabo%' then '2'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'injet%' then '3'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'materia prima%' then '4'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'kit%' then '5'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'limpeza%' then '6'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'escritorio%' then '7'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'barramento%' then '8'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'perfil%' then '9'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'inserto%' then '10'
  when translate(lower(nome), 'áéíóúãõâêôç', 'aeiouaoaeoc') like 'grupo%' then '11'
  else prefixo_codigo
end
where prefixo_codigo is null;

-- A rotina passa a interpretar p_grupo_codigo como ID de erp_grupos e usa seu prefixo.
create or replace function public.erp_gerar_codigo(p_config_id uuid, p_grupo_codigo text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_empresa_id uuid;
  v_prefixo text;
  v_sep text;
  v_modo text;
  v_seq integer;
  v_base text;
  v_code text;
  v_group_prefix text;
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
    if nullif(trim(coalesce(p_grupo_codigo, '')), '') is null then
      raise exception 'Grupo é obrigatório para o modo prefixo + grupo + sequência';
    end if;
    select nullif(trim(g.prefixo_codigo), '') into v_group_prefix
    from public.erp_grupos g
    where g.empresa_id = v_empresa_id
      and g.ativo = true
      and (g.id::text = p_grupo_codigo or g.codigo = p_grupo_codigo or lower(g.nome) = lower(p_grupo_codigo))
    limit 1;
    if v_group_prefix is null then
      raise exception 'Grupo não encontrado ou sem prefixo numérico configurado para esta empresa';
    end if;
    if v_group_prefix !~ '^[0-9]{1,3}$' then
      raise exception 'Prefixo do grupo deve conter de 1 a 3 dígitos numéricos';
    end if;
    v_base := v_prefixo || v_sep || v_group_prefix;
  elsif v_modo = 'PS' then
    v_base := v_prefixo;
  elsif v_modo = 'NUM' then
    v_base := '';
  else
    raise exception 'Modo de numeração inválido: %', v_modo;
  end if;

  select coalesce(max(h.sequencia), 0)::integer + 1 into v_seq
  from public.erp_historico_codigos h
  where h.empresa_id = v_empresa_id and h.codigo_base = v_base;

  if v_modo = 'NUM' then
    v_code := lpad(v_seq::text, greatest(v_config.digitos_produto, 3), '0');
  else
    v_code := v_base || v_sep || lpad(v_seq::text, greatest(v_config.digitos_produto, 3), '0');
  end if;

  insert into public.erp_historico_codigos(empresa_id, codigo_completo, codigo_base, sequencia, gerado_por)
  values (v_empresa_id, v_code, v_base, v_seq, v_uid);

  update public.erp_codigos
  set sequencia_atual = greatest(sequencia_atual, v_seq), updated_at = now()
  where id = p_config_id;

  return v_code;
end;
$function$;

-- A regra da empresa passa a gerar códigos pelo prefixo do grupo.
update public.erp_codigos c
set modo_numeracao = 'PGR', separador = '', digitos_produto = 4, updated_at = now()
where exists (
  select 1 from public.erp_grupos g
  where g.empresa_id = c.empresa_id and g.ativo = true
    and nullif(btrim(g.prefixo_codigo), '') is not null
);

-- O cadastro mestre precisa atualizar produtos dentro do próprio tenant; master continua autorizado.
drop policy if exists erp_produtos_tenant_update on public.erp_produtos;
create policy erp_produtos_tenant_update on public.erp_produtos
for update to authenticated
using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
