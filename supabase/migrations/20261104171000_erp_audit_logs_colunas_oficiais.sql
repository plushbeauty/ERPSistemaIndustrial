-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — ERP_AUDIT_LOGS: UNICA GRAFIA DE COLUNAS
-- @AUTOR: Fernando Schuinsekel
-- Data: 2026-11-04
--
-- O DEFEITO QUE ESTA MIGRATION FECHA
-- A tabela foi criada em 20260913000100_erp_rbac_multitenant_hardening.sql:305
-- com as colunas oficias empresa_id / actor_user_id / entity_type. As politicas
-- RLS, os indices e a maioria dos gravadores usam essa grafia
-- (20260915020500, 20261005180000:628, 20261006090000:973, 20261030160000:340).
-- Tres gravadores ficaram em uma grafia que nao existe na tabela:
--   * 20260922040000_erp_produtos_cadastro_mestre_v1.sql:106 — trigger
--     erp_produto_audit(), ou seja, todo INSERT/UPDATE/DELETE de produto
--     tentava gravar (company_id,user_id,module,entity) e abortava a
--     transacao do cadastro inteiro com 42703.
--   * 20261003193000 e 20261031150000:462 — RPC erp_retificar_pedido_faturado(),
--     mesma grafia, abortando a retificacao do pedido ja faturado.
-- Leitura no mesmo sentido: trs telas consultavam company_id / user_id / entity
-- (Master.tsx:58, AdministracaoConfiguracoesGlobais.tsx:74,
-- ProdutosVendasIndustrial.tsx:227) e por isso nunca exibiram auditoria;
-- AdminLogs.tsx:40 e ConfiguracaoLogs.tsx:46 ja usavam a grafia oficial.
--
-- O QUE ESTA MIGRATION FAZ
-- 1. Garante as colunas oficiais numa base que possa ter ficado so com a grafia
--    legada (add column if not exists; nada é apagado, nada é reescrito).
-- 2. Cria module text, informação que a grafia legada gravava e que no contrato
--    oficial nao tinha onde ficar.
-- 3. Recria os dois gravadores defeituosos com as colunas oficiais, preservando
--    o restante do corpo, o security definer e os grants.
-- Nenhum dado existente é modificado.
-- ============================================================================

begin;

-- 1) colunas oficiais garantidas ------------------------------------------------
alter table if exists public.erp_audit_logs
  add column if not exists empresa_id uuid references public.erp_empresas(id) on delete set null;
alter table if exists public.erp_audit_logs
  add column if not exists actor_user_id uuid references public.erp_usuarios(id) on delete set null;
alter table if exists public.erp_audit_logs
  add column if not exists entity_type text;

-- 2) modulo do evento (cadastro, controladoria, compras, ...) -------------------
alter table if exists public.erp_audit_logs
  add column if not exists module text;

create index if not exists idx_erp_audit_logs_empresa_data
  on public.erp_audit_logs (empresa_id, created_at desc);
create index if not exists idx_erp_audit_logs_entidade
  on public.erp_audit_logs (entity_type, entity_id, created_at desc);

comment on column public.erp_audit_logs.module is
  'Modulo de negocio do evento (ex.: produtos, CONTROLADORIA). Livre; a entidade fica em entity_type.';

-- 3) trigger de auditoria do cadastro de produtos ------------------------------
create or replace function public.erp_produto_audit()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid;
  v_action text;
begin
  v_empresa := coalesce(new.empresa_id, old.empresa_id);
  v_action := case tg_op
    when 'INSERT' then 'produto_criado'
    when 'UPDATE' then 'produto_atualizado'
    when 'DELETE' then 'produto_excluido'
  end;

  insert into public.erp_audit_logs(
    empresa_id,actor_user_id,action,module,entity_type,entity_id,old_data,new_data,created_at
  )
  values(
    v_empresa,auth.uid(),v_action,'produtos','erp_produtos',
    coalesce(new.id,old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    now()
  );

  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_erp_produto_audit on public.erp_produtos;
create trigger trg_erp_produto_audit
after insert or update or delete on public.erp_produtos
for each row execute function public.erp_produto_audit();

-- 4) retificacao de pedido ja faturado (Controladoria) --------------------------
create or replace function public.erp_retificar_pedido_faturado(
  p_pedido_id uuid,
  p_pedido_cliente text,
  p_vendedor_nome text,
  p_condicao_pagamento text,
  p_itens jsonb default '[]'::jsonb,
  p_motivo text default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_perfil text;
  v_master boolean;
  v_pedido public.erp_pedidos_venda%rowtype;
  v_old jsonb;
  v_new jsonb;
  v_item jsonb;
  v_item_id uuid;
  v_new_descricao text;
  v_condition_changed boolean;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select u.empresa_id,
         upper(trim(coalesce(u.perfil,''))),
         (u.is_master is true
          and coalesce(u.nivel_admin,0)>=100
          and upper(btrim(coalesce(u.perfil,'')))='MASTER'
          and u.empresa_id is null
          and u.setor_id is null)
    into v_empresa,v_perfil,v_master
  from public.erp_usuarios u
  where u.auth_user_id=v_uid and u.ativo=true and u.deleted_at is null
  limit 1;

  if v_empresa is null and not v_master then
    raise exception 'EMPRESA_REQUIRED';
  end if;
  if not v_master and v_perfil not in ('ADMINISTRADOR','CONTROLADORIA') then
    raise exception 'RETIFICACAO_NAO_AUTORIZADA';
  end if;

  select * into v_pedido
  from public.erp_pedidos_venda p
  where p.id=p_pedido_id and (v_master or p.empresa_id=v_empresa)
  for update;
  if not found then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;

  if lower(trim(coalesce(v_pedido.status,''))) in ('rascunho','aberto','cotação','cotacao') then
    raise exception 'PEDIDO_AINDA_ABERTO';
  end if;

  v_condition_changed := coalesce(v_pedido.condicao_pagamento,'') <> coalesce(p_condicao_pagamento,'');
  if v_condition_changed and exists (
    select 1 from public.erp_contas_receber cr
    where cr.empresa_id=v_pedido.empresa_id
      and (cr.documento=v_pedido.numero::text
        or (v_pedido.pedido_cliente is not null and cr.documento=v_pedido.pedido_cliente))
  ) then
    raise exception 'Não é permitido alterar as condições de pagamento de um faturamento que já possui lançamentos financeiros ou baixas pagas.';
  end if;

  v_old := jsonb_build_object(
    'pedido_cliente',v_pedido.pedido_cliente,
    'vendedor_nome',v_pedido.vendedor_nome,
    'condicao_pagamento',v_pedido.condicao_pagamento,
    'itens',coalesce((
      select jsonb_agg(jsonb_build_object('id',i.id,'descricao',i.descricao) order by i.id)
      from public.erp_pedidos_venda_itens i
      where i.empresa_id=v_pedido.empresa_id and i.pedido_id=v_pedido.id
    ),'[]'::jsonb)
  );

  if p_itens is null or jsonb_typeof(p_itens)<>'array' then
    raise exception 'ITENS_INVALIDOS';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    if jsonb_typeof(v_item)<>'object'
       or (v_item-'id'-'descricao')<>'{}'::jsonb
       or not (v_item?'id') or not (v_item?'descricao') then
      raise exception 'CAMPO_ITEM_NAO_PERMITIDO';
    end if;
    v_item_id := (v_item->>'id')::uuid;
    v_new_descricao := v_item->>'descricao';
    update public.erp_pedidos_venda_itens
      set descricao=v_new_descricao
    where id=v_item_id and empresa_id=v_pedido.empresa_id and pedido_id=v_pedido.id;
    if not found then raise exception 'ITEM_NAO_ENCONTRADO'; end if;
  end loop;

  update public.erp_pedidos_venda
  set pedido_cliente=p_pedido_cliente,
      vendedor_nome=p_vendedor_nome,
      condicao_pagamento=p_condicao_pagamento,
      updated_at=now()
  where id=v_pedido.id and empresa_id=v_pedido.empresa_id;

  v_new := jsonb_build_object(
    'pedido_cliente',p_pedido_cliente,
    'vendedor_nome',p_vendedor_nome,
    'condicao_pagamento',p_condicao_pagamento,
    'itens',coalesce((
      select jsonb_agg(jsonb_build_object('id',i.id,'descricao',i.descricao) order by i.id)
      from public.erp_pedidos_venda_itens i
      where i.empresa_id=v_pedido.empresa_id and i.pedido_id=v_pedido.id
    ),'[]'::jsonb)
  );

  insert into public.erp_audit_logs
    (empresa_id,actor_user_id,action,module,entity_type,entity_id,old_data,new_data,created_at)
  values
    (v_pedido.empresa_id,v_uid,'RETIFICAR_PEDIDO','CONTROLADORIA',
     'erp_pedidos_venda',v_pedido.id,v_old,
     jsonb_build_object('alterado',v_new,'motivo',p_motivo),now());

  return jsonb_build_object(
    'ok',true,'pedido_id',v_pedido.id,'empresa_id',v_pedido.empresa_id,
    'financial_fields_changed',false,'condition_changed',v_condition_changed
  );
end;
$$;

revoke all on function public.erp_retificar_pedido_faturado(uuid,text,text,text,jsonb,text) from public,anon;
grant execute on function public.erp_retificar_pedido_faturado(uuid,text,text,text,jsonb,text) to authenticated;

commit;
