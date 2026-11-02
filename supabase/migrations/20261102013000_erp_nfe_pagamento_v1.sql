/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-FISCAL-NFE-PAGAMENTO-20261102-01 — forma de pagamento da NF-e em tabela e RPC próprias, porque a RPC de rascunho vigiada pelo contrato não aceita nenhuma chave de pagamento
 * @STATUS_APROVACAO: AGUARDA APLICAÇÃO DESTE ARQUIVO SQL PELO PROPRIETÁRIO (só a anon key existe no frontend)
 */

-- ---------------------------------------------------------------------------
-- Fatos verificados antes de escrever este arquivo
--   * erp_salvar_rascunho_nfe (20261005130000:735-860) aceita exatamente as
--     colunas de cabeçalho listadas no insert/update e nenhuma chave de
--     pagamento: grep por "pagamento|tcard|dedu" naquele arquivo não devolve
--     nada. Mudar aquela RPC para caber pagamento violaria o contrato estático
--     que scripts/verify-nfe-contract.mjs vigia. Por isso o pagamento entra por
--     tabela + RPC desta arquivo, e não por coluna nova no rascunho.
--   * A mesma RPC trava o documento em modelo 55, tipo NF-e/NF-e Entrada e
--     status Rascunho; a totais validados no servidor são valor_produtos = soma
--     dos itens e valor_total = itens + frete + outras despesas + IPI + ICMS-ST
--     - desconto (20261005130000:828-843). O único número que a etapa de
--     pagamento tem de fechar é valor_total.
--   * A Edge Function emitir-nfe (supabase/functions/emitir-nfe/index.ts:140-224
--     e 370-415) não lê nem grava pagamento: ela transmite o que o rascunho
--     tem. Este arquivo, portanto, não destrava emissão nenhuma — cria só o
--     cadastro de pagamento que a tela precisa ter antes de transmitir.
--   * erp_current_empresa_id(), erp_is_master() e erp_has_permission(modulo,
--     acao) são os helpers canônicos já usados por 20261005130000:28-208. Este
--     arquivo não cita o helper legado erp_current_company_id.
--   * O domínio de tPag (forma de pagamento) vai de 01 a 99 no MAN, com 90 =
--     "Sem pagamento". Não invento aqui uma lista fechada de códigos: a
--     constraint aceita o intervalo e a regra específica do 90 é validada na
--     RPC. "condicao" é rótulo interno da tela (à vista / a prazo), não campo
--     transmitido.
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- 1 · Tabela de pagamentos do rascunho
--    Uma linha por grupo detPag. A ordem é fixada por item_numero e o conjunto
--    inteiro é regravado pela RPC, igual ao que a RPC de rascunho faz com itens.
-- ---------------------------------------------------------------------------
create table if not exists public.erp_nfe_pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  documento_id uuid not null references public.erp_documentos_fiscais(id) on delete cascade,
  item_numero integer not null check (item_numero > 0),
  forma text not null check (forma ~ '^[0-9]{1,2}$' and forma::integer between 1 and 99),
  forma_descricao text not null check (length(btrim(forma_descricao)) between 1 and 60),
  condicao text check (condicao is null or condicao in ('a_vista', 'a_prazo')),
  valor numeric(15,2) not null check (valor >= 0),
  troco numeric(15,2) check (troco is null or troco >= 0),
  bandeira text check (bandeira is null or bandeira ~ '^[0-9]{1,2}$'),
  observacao text check (observacao is null or length(btrim(observacao)) <= 500),
  criado_por uuid,
  criado_por_nome text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint erp_nfe_pagamentos_item_unico unique (documento_id, item_numero)
);

create index if not exists erp_nfe_pagamentos_empresa_documento_idx
  on public.erp_nfe_pagamentos (empresa_id, documento_id, item_numero);

-- ---------------------------------------------------------------------------
-- 2 · RLS: leitura pelo tenant com permissão fiscal 'ver'; escrita SOMENTE pela
--    RPC security definer (as guardas de escrita negam qualquer SQL direto).
-- ---------------------------------------------------------------------------
alter table public.erp_nfe_pagamentos enable row level security;

revoke all on table public.erp_nfe_pagamentos from public, anon, authenticated, service_role;
grant select on table public.erp_nfe_pagamentos to authenticated;

drop policy if exists erp_nfe_pagamentos_tenant_guard on public.erp_nfe_pagamentos;
drop policy if exists erp_nfe_pagamentos_select on public.erp_nfe_pagamentos;
drop policy if exists erp_nfe_pagamentos_insert_guard on public.erp_nfe_pagamentos;
drop policy if exists erp_nfe_pagamentos_update_guard on public.erp_nfe_pagamentos;
drop policy if exists erp_nfe_pagamentos_delete_guard on public.erp_nfe_pagamentos;
drop policy if exists erp_nfe_pagamentos_anon_deny on public.erp_nfe_pagamentos;

create policy erp_nfe_pagamentos_tenant_guard
  on public.erp_nfe_pagamentos
  as restrictive
  for all to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    or public.erp_is_master()
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    or public.erp_is_master()
  );

create policy erp_nfe_pagamentos_select
  on public.erp_nfe_pagamentos
  for select to authenticated
  using (
    (
      empresa_id = public.erp_current_empresa_id()
      or public.erp_is_master()
    )
    and public.erp_has_permission('fiscal', 'ver')
  );

create policy erp_nfe_pagamentos_insert_guard
  on public.erp_nfe_pagamentos
  as restrictive
  for insert to authenticated
  with check (false);

create policy erp_nfe_pagamentos_update_guard
  on public.erp_nfe_pagamentos
  as restrictive
  for update to authenticated
  using (false)
  with check (false);

create policy erp_nfe_pagamentos_delete_guard
  on public.erp_nfe_pagamentos
  as restrictive
  for delete to authenticated
  using (false);

create policy erp_nfe_pagamentos_anon_deny
  on public.erp_nfe_pagamentos
  as restrictive
  for all to anon
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- 3 · RPC de gravação. Mesmos guardas da RPC de rascunho (sessão, usuário ERP
--    ativo, exceção Master com empresa nula, permissão fiscal, tenant, modelo
--    55 e status Rascunho) mais a soma de pagamentos fechando o valor_total do
--    documento já gravado. Nunca toca o cabeçalho: quem calcula total é a RPC
--    de rascunho.
-- ---------------------------------------------------------------------------
create or replace function public.erp_nfe_pagamento_salvar(
  p_documento_id uuid,
  p_pagamentos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_sessao_empresa_id uuid := public.erp_current_empresa_id();
  v_documento public.erp_documentos_fiscais%rowtype;
  v_usuario_id uuid;
  v_usuario_empresa_id uuid;
  v_usuario_nome text;
  v_master boolean;
  v_pagamento jsonb;
  v_numeros integer[] := array[]::integer[];
  v_numero_numeric numeric;
  v_quantidade integer := 0;
  v_soma numeric := 0;
  v_forma text;
  v_valor numeric;
  v_total_documento numeric;
begin
  if auth.uid() is null then
    raise exception 'Sessão de autenticação obrigatória' using errcode = '42501';
  end if;

  if p_documento_id is null then
    raise exception 'O rascunho fiscal deve ser informado' using errcode = '22023';
  end if;

  if p_pagamentos is null or jsonb_typeof(p_pagamentos) is distinct from 'array' then
    raise exception 'Os pagamentos devem ser enviados como uma lista' using errcode = '22023';
  end if;

  select u.id, u.empresa_id, u.nome
  into v_usuario_id, v_usuario_empresa_id, v_usuario_nome
  from public.erp_usuarios u
  where u.auth_user_id = auth.uid()
    and u.ativo = true
    and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não localizado para esta sessão' using errcode = '42501';
  end if;

  v_master := public.erp_is_master();
  if v_master is true then
    if v_usuario_empresa_id is not null or v_sessao_empresa_id is not null then
      raise exception 'Perfil Master inconsistente com o contrato de empresa nula' using errcode = '42501';
    end if;
  elsif v_usuario_empresa_id is null
        or v_sessao_empresa_id is null
        or v_usuario_empresa_id is distinct from v_sessao_empresa_id then
    raise exception 'Usuário sem empresa ativa vinculada à sessão' using errcode = '42501';
  end if;

  if public.erp_has_permission('fiscal', 'emitir') is distinct from true then
    raise exception 'Usuário sem permissão fiscal para gravar pagamentos da NF-e' using errcode = '42501';
  end if;

  select d.* into v_documento
  from public.erp_documentos_fiscais d
  where d.id = p_documento_id
    and (v_master = true or d.empresa_id = v_sessao_empresa_id)
  for update;

  if not found then
    raise exception 'Documento fiscal não encontrado para a empresa autorizada' using errcode = '42501';
  end if;

  if v_documento.empresa_id is distinct from v_sessao_empresa_id
     and v_master is not true then
    raise exception 'Empresa não autorizada para esta sessão' using errcode = '42501';
  end if;

  if v_documento.modelo is distinct from '55'
     or v_documento.tipo not in ('NF-e', 'NF-e Entrada') then
    raise exception 'Pagamento é cadastrado somente em NF-e modelo 55' using errcode = '22023';
  end if;

  if v_documento.status is distinct from 'Rascunho' then
    raise exception 'Somente NF-e em rascunho aceita pagamento; o documento está em %', v_documento.status
      using errcode = '42501';
  end if;

  v_total_documento := coalesce(v_documento.valor_total, 0);

  for v_pagamento in
    select value from jsonb_array_elements(p_pagamentos)
  loop
    if jsonb_typeof(v_pagamento) <> 'object' then
      raise exception 'Cada pagamento deve ser um objeto JSON' using errcode = '22023';
    end if;

    if jsonb_typeof(v_pagamento->'item_numero') is distinct from 'number' then
      raise exception 'A ordem do pagamento deve ser numérica' using errcode = '22023';
    end if;

    v_numero_numeric := (v_pagamento->>'item_numero')::numeric;
    if v_numero_numeric <> trunc(v_numero_numeric)
       or v_numero_numeric < 1
       or v_numero_numeric > 2147483647 then
      raise exception 'A ordem dos pagamentos deve ser um inteiro positivo' using errcode = '22023';
    end if;

    if v_numero_numeric::integer = any(v_numeros) then
      raise exception 'A ordem dos pagamentos não pode se repetir' using errcode = '22023';
    end if;
    v_numeros := array_append(v_numeros, v_numero_numeric::integer);

    v_forma := nullif(btrim(coalesce(v_pagamento->>'forma', '')), '');
    if v_forma is null
       or v_forma !~ '^[0-9]{1,2}$'
       or v_forma::integer not between 1 and 99 then
      raise exception 'A forma de pagamento (tPag) deve ser um código de 01 a 99' using errcode = '22023';
    end if;

    if coalesce(btrim(v_pagamento->>'forma_descricao'), '') = '' then
      raise exception 'Cada pagamento exige a descrição da forma usada' using errcode = '22023';
    end if;

    if coalesce(v_pagamento->>'condicao', '') <> ''
       and v_pagamento->>'condicao' not in ('a_vista', 'a_prazo') then
      raise exception 'A condição de pagamento deve ser à vista ou a prazo' using errcode = '22023';
    end if;

    if jsonb_typeof(v_pagamento->'valor') is distinct from 'number' then
      raise exception 'O valor pago deve ser numérico' using errcode = '22023';
    end if;
    v_valor := (v_pagamento->>'valor')::numeric;
    if v_valor < 0 then
      raise exception 'O valor pago não pode ser negativo' using errcode = '22023';
    end if;

    if v_pagamento ? 'troco'
       and jsonb_typeof(v_pagamento->'troco') not in ('number', 'null') then
      raise exception 'O troco, quando informado, deve ser numérico' using errcode = '22023';
    end if;

    if coalesce((v_pagamento->>'troco')::numeric, 0) > v_valor then
      raise exception 'O troco não pode ser maior que o valor recebido' using errcode = '22023';
    end if;

    if coalesce(btrim(v_pagamento->>'bandeira'), '') <> ''
       and btrim(v_pagamento->>'bandeira') !~ '^[0-9]{1,2}$' then
      raise exception 'A bandeira, quando informada, deve ser um código numérico' using errcode = '22023';
    end if;

    if v_forma = '90'
       and (jsonb_array_length(p_pagamentos) <> 1 or v_valor <> 0) then
      raise exception 'A forma 90 (sem pagamento) é o único grupo do documento e o valor deve ser zero' using errcode = '22023';
    end if;

    v_soma := v_soma + v_valor;
    v_quantidade := v_quantidade + 1;
  end loop;

  if v_quantidade = 0 and v_total_documento <> 0 then
    raise exception 'Informe ao menos um pagamento para fechar o valor total da NF-e' using errcode = '22023';
  end if;

  if v_quantidade > 0
     and round(v_soma, 2) <> round(v_total_documento, 2) then
    raise exception 'A soma dos pagamentos não fecha com o valor total da NF-e' using errcode = '22023';
  end if;

  delete from public.erp_nfe_pagamentos
  where documento_id = v_documento.id
    and empresa_id = v_documento.empresa_id;

  insert into public.erp_nfe_pagamentos (
    empresa_id, documento_id, item_numero, forma, forma_descricao, condicao,
    valor, troco, bandeira, observacao, criado_por, criado_por_nome, atualizado_em
  )
  select
    v_documento.empresa_id, v_documento.id,
    (p->>'item_numero')::integer,
    btrim(p->>'forma'),
    btrim(p->>'forma_descricao'),
    nullif(btrim(coalesce(p->>'condicao', '')), ''),
    coalesce((p->>'valor')::numeric, 0),
    nullif(btrim(coalesce(p->>'troco', '')), '')::numeric,
    nullif(btrim(coalesce(p->>'bandeira', '')), ''),
    nullif(btrim(coalesce(p->>'observacao', '')), ''),
    v_usuario_id, v_usuario_nome, now()
  from jsonb_array_elements(p_pagamentos) as p;

  insert into public.erp_logs_sistema (
    empresa_id, usuario_id, modulo, acao, entidade, entidade_id, dados
  )
  values (
    v_documento.empresa_id, v_usuario_id, 'Fiscal', 'NFE_PAGAMENTO_SALVO',
    'erp_nfe_pagamentos', v_documento.id,
    jsonb_build_object(
      'quantidade', v_quantidade,
      'valor_pago', round(v_soma, 2),
      'valor_documento', round(v_total_documento, 2)
    )
  );

  return jsonb_build_object(
    'documento_id', v_documento.id::text,
    'quantidade', v_quantidade,
    'valor_pago', round(v_soma, 2),
    'valor_documento', round(v_total_documento, 2),
    'diferenca', round(v_soma - v_total_documento, 2),
    'evento', 'pagamentos_salvos'
  );
end;
$function$;

revoke all on function public.erp_nfe_pagamento_salvar(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.erp_nfe_pagamento_salvar(uuid, jsonb)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 4 · Leitura agregada para a etapa de revisão: devolve o pagamento já somado
--    por documento, sem abrir a tabela para escrita.
-- ---------------------------------------------------------------------------
create or replace function public.erp_nfe_pagamento_consultar(p_documento_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'documento_id', p_documento_id,
    'pagamentos', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'item_numero', pg.item_numero,
          'forma', pg.forma,
          'forma_descricao', pg.forma_descricao,
          'condicao', pg.condicao,
          'valor', pg.valor,
          'troco', pg.troco,
          'bandeira', pg.bandeira,
          'observacao', pg.observacao
        )
        order by pg.item_numero
      ) filter (where pg.id is not null),
      '[]'::jsonb
    ),
    'valor_pago', coalesce(sum(pg.valor), 0),
    'registrado_em', max(pg.atualizado_em)
  )
  from public.erp_nfe_pagamentos pg
  where pg.documento_id = p_documento_id;
$function$;

revoke all on function public.erp_nfe_pagamento_consultar(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.erp_nfe_pagamento_consultar(uuid)
  to authenticated;

commit;
