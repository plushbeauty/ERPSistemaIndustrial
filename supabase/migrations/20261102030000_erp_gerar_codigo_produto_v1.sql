/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-CADASTROS-CODIGO-PRODUTO-20261102-01 — cria a RPC erp_gerar_codigo_produto, que o frontend chama desde sempre mas nenhuma migration versionada definia
 * @STATUS_APROVACAO: AGUARDA APLICAÇÃO DESTE ARQUIVO SQL PELO PROPRIETÁRIO (só a anon key existe no frontend)
 */

-- ---------------------------------------------------------------------------
-- Fatos verificados antes de escrever este arquivo
--   * src/pages/cadastro-produtos/FormFichaTecnica.tsx:113 chama
--     supabase.rpc('erp_gerar_codigo_produto', { p_config_id, p_tipo_sigla }) e
--     usa o retorno como SKU do insert em erp_produtos. grep em
--     supabase/migrations não devolve NENHUMA definição dessa função: a tela de
--     ficha técnica nasce com o SKU travado em erro de banco.
--   * A mesma tela lê erp_codigos(id,prefixo,digitos_produto) e a tela
--     ParametrosCodigo.tsx:56 grava prefixo, separador, modo_numeracao,
--     sequencia_atual e digitos_produto. A coluna digitos_produto tampouco
--     existe em alguma migration: 20260928200000_erp_config_codificacao_areas_
--     historico_rbac_alignment.sql:1-10 cria erp_codigos sem ela. Este arquivo
--     adiciona a coluna antes de definir a função, senão a função nasce
--     quebrando na primeira empresa.
--   * Regra de composição lida da própria UI (FormFichaTecnica.tsx:96,
--     preview = prefixo + tipo + zeros) e das três opções de modo de
--     ParametrosCodigo.tsx:195-197: PS = prefixo e sigla, PGR = grupo de
--     produto, NUM = numeração pura. Não existe cadastro de "grupo de produto"
--     ligado a erp_codigos, então PGR é recusado com erro explícito em vez de
--     ser improvisado.
--   * unicidade real do SKU: ux_erp_produtos_empresa_codigo_lower on
--     erp_produtos(empresa_id, lower(trim(codigo)))
--     (20260912200000_industrial_produtos_vendas_estoque_integrity_v1.sql:5).
--     A função confere esse mesmo critério antes de devolver o código.
--   * erp_historico_codigos (20260928200000:31-39) já existe para auditar
--     código gerado, com gerado_por referenciando erp_usuarios(id) — não o
--     auth.uid(). A função resolve o erp_usuarios.id antes de gravar.
--   * erp_current_empresa_id() é o helper canônico de tenant usado pelas
--     policies da própria erp_codigos (20260928200000:64-77).
-- ---------------------------------------------------------------------------

begin;

-- 1 · Coluna que a UI já lê e grava, mas o banco não tinha.
alter table public.erp_codigos
  add column if not exists digitos_produto integer not null default 3;

do $$ begin
  alter table public.erp_codigos
    add constraint erp_codigos_digitos_produto_chk check (digitos_produto between 3 and 6);
exception when duplicate_object then null;
end $$;

-- 2 · Geração do SKU. Security definer porque precisa incrementar
--     sequencia_atual com a linha travada: duas fichas abertas no mesmo
--     navegador não podem receber o mesmo número, e o incremento tem de ser
--     atômico com a gravação do histórico.
create or replace function public.erp_gerar_codigo_produto(
  p_config_id uuid,
  p_tipo_sigla text
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $function$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_cfg record;
  v_tipo text;
  v_seq integer;
  v_codigo text;
  v_separador text;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if v_empresa is null then
    raise exception 'EMPRESA_REQUIRED';
  end if;
  if p_config_id is null then
    raise exception 'REGRA_NUMERACAO_NAO_INFORMADA';
  end if;

  v_tipo := upper(btrim(coalesce(p_tipo_sigla, '')));
  if v_tipo !~ '^[A-Z]{2}$' then
    raise exception 'TIPO_INVALIDO';
  end if;

  select
    c.id,
    btrim(coalesce(c.prefixo, '')) as prefixo,
    coalesce(c.separador, '') as separador,
    upper(btrim(coalesce(c.modo_numeracao, 'PS'))) as modo_numeracao,
    coalesce(c.sequencia_atual, 0) as sequencia_atual,
    coalesce(c.digitos_produto, 3) as digitos_produto
    into v_cfg
    from public.erp_codigos c
   where c.id = p_config_id
     and c.empresa_id = v_empresa
     for update;

  if not found then
    raise exception 'REGRA_NUMERACAO_NAO_ENCONTRADA';
  end if;
  if v_cfg.prefixo !~* '^[A-Z0-9]{1,8}$' then
    raise exception 'PREFIXO_INVALIDO';
  end if;
  if v_cfg.modo_numeracao = 'PGR' then
    raise exception 'MODO_PGR_INDISPONIVEL'
      using hint = 'O modo PGR exige cadastro de grupo de produto vinculado à regra, que ainda não existe no sistema. Use PS (prefixo e sigla) ou NUM (numeração pura).';
  end if;
  if v_cfg.modo_numeracao not in ('PS', 'NUM') then
    raise exception 'MODO_NUMERACAO_INVALIDO';
  end if;

  v_seq := v_cfg.sequencia_atual + 1;
  if v_seq > power(10, v_cfg.digitos_produto)::integer - 1 then
    raise exception 'SEQUENCIA_ESGOTADA';
  end if;

  v_separador := btrim(v_cfg.separador);
  v_codigo := upper(v_cfg.prefixo)
    || case when v_separador <> '' then v_separador else '' end
    || case when v_cfg.modo_numeracao = 'PS' then v_tipo else '' end
    || lpad(v_seq::text, v_cfg.digitos_produto, '0');

  if exists (
    select 1
      from public.erp_produtos p
     where p.empresa_id = v_empresa
       and lower(btrim(p.codigo)) = lower(v_codigo)
  ) then
    raise exception 'CODIGO_JA_EXISTENTE';
  end if;

  update public.erp_codigos
     set sequencia_atual = v_seq,
         updated_at = now()
   where id = v_cfg.id;

  select u.id
    into v_usuario_id
    from public.erp_usuarios u
   where u.auth_user_id = v_uid
     and u.empresa_id = v_empresa
     and u.ativo = true
     and u.deleted_at is null
   limit 1;

  insert into public.erp_historico_codigos (
    empresa_id, codigo_completo, codigo_base, sequencia, gerado_por
  )
  values (
    v_empresa, v_codigo, upper(v_cfg.prefixo), v_seq, v_usuario_id
  );

  return v_codigo;
end;
$function$;

-- 3 · Superfície de execução: só usuários autenticados, sem anon.
revoke all on function public.erp_gerar_codigo_produto(uuid, text) from public, anon;
grant execute on function public.erp_gerar_codigo_produto(uuid, text) to authenticated;

comment on function public.erp_gerar_codigo_produto(uuid, text) is
  'Gera o SKU de um produto a partir de uma regra de erp_codigos da empresa da sessão: prefixo + separador + sigla do tipo (modo PS) + sequência com digitos_produto casas. Incrementa sequencia_atual com a linha travada e grava erp_historico_codigos.';

commit;
