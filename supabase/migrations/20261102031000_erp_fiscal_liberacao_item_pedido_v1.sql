/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-FISCAL-LIBERACAO-ITEM-20261102-01 — cria a RPC erp_liberar_item_fiscal e a tabela de saldos liberados, que o frontend chama mas nenhuma migration versionada definia
 * @STATUS_APROVACAO: AGUARDA APLICAÇÃO DESTE ARQUIVO SQL PELO PROPRIETÁRIO (só a anon key existe no frontend)
 */

-- ---------------------------------------------------------------------------
-- Fatos verificados antes de escrever este arquivo
--   * src/pages/Fiscal.tsx:134 chama supabase.rpc('erp_liberar_item_fiscal',
--     { p_pedido_item_id, p_quantidade, p_tipo, p_observacao }) e lê
--     data.saldo_restante da resposta. docs/FISCAL_ARQUITETURA_BASELINE.md:13 e
--     docs/FISCAL_MATRIZ_COMPLETUDE.md:112 já registravam: "a definição da RPC
--     não foi localizada nas migrations versionadas" e o item da matriz está
--     marcado como BLOQUEADO. Este arquivo é a definição que faltava.
--   * As migrations de endurecimento 20260921180000:6 e
--     20260925170000:7 já faziam "revoke execute on function
--     public.erp_liberar_item_fiscal(uuid,numeric,text,text)": a assinatura é
--     essa e não pode mudar, senão o revoke publicado fica órfão.
--   * Colunas reais lidas de SQL aprovado: erp_pedidos_venda_itens tem id,
--     empresa_id, pedido_id, descricao e quantidade (Fiscal.tsx:115 e o update
--     de erp_retificar_pedido_faturado em 20261031150000:437-441);
--     erp_pedidos_venda tem id, empresa_id, numero, status, pedido_cliente e
--     condicao_pagamento (20261031150000:400-455).
--   * Status de pedido aberto, na mesma lista usada pela retificação
--     (20261031150000:400): rascunho, aberto, cotação, cotacao. Liberar
--     faturamento de um pedido ainda em cotação não é ato fiscal.
--   * erp_logs_sistema(empresa_id, usuario_id, modulo, acao, entidade,
--     entidade_id, dados) é a trilha usada pelas RPCs fiscais
--     (20260924210000:186 e 20261102013000:328-338). usuario_id é o
--     erp_usuarios.id, obtido por auth_user_id = auth.uid(), como em
--     20261102013000:174-184.
--   * erp_current_empresa_id(), erp_is_master() e erp_has_permission(modulo,
--     acao) são os helpers canônicos (20260916141000:33-68).
--   * LIMITES DESTE ARQUIVO, para não simular o que não existe: a liberação
--     registra o saldo que o Fiscal autoriza a faturar. Ela NÃO baixa estoque,
--     NÃO cria erp_documentos_fiscais, NÃO move o status do pedido e NÃO
--     comunica SEFAZ/integrador nenhum. Nenhum desses efeitos é simulado aqui.
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- 1 · Tabela de liberações: uma linha por ato de liberação, para que o saldo
--    seja reconstruído pela soma dos atos e não por um flag único no item.
-- ---------------------------------------------------------------------------
create table if not exists public.erp_fiscal_liberacoes_pedido_item (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  pedido_id uuid not null references public.erp_pedidos_venda(id) on delete restrict,
  pedido_item_id uuid not null references public.erp_pedidos_venda_itens(id) on delete restrict,
  quantidade numeric(18,6) not null,
  tipo text not null,
  observacao text,
  usuario_id uuid references public.erp_usuarios(id) on delete set null,
  usuario_nome text,
  liberado_em timestamptz not null default now(),
  constraint erp_fiscal_liberacao_quantidade_chk check (quantidade > 0),
  constraint erp_fiscal_liberacao_tipo_chk check (tipo in ('total', 'parcial'))
);

create index if not exists erp_fiscal_liberacao_item_idx
  on public.erp_fiscal_liberacoes_pedido_item (empresa_id, pedido_item_id);
create index if not exists erp_fiscal_liberacao_pedido_idx
  on public.erp_fiscal_liberacoes_pedido_item (empresa_id, pedido_id);

alter table public.erp_fiscal_liberacoes_pedido_item enable row level security;

-- Leitura pelo tenant; escrita exclusivamente pela RPC security definer.
drop policy if exists erp_fiscal_liberacao_tenant_select on public.erp_fiscal_liberacoes_pedido_item;
create policy erp_fiscal_liberacao_tenant_select on public.erp_fiscal_liberacoes_pedido_item
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_fiscal_liberacao_escrita_bloqueada on public.erp_fiscal_liberacoes_pedido_item;
create policy erp_fiscal_liberacao_escrita_bloqueada on public.erp_fiscal_liberacoes_pedido_item
  for insert to authenticated with check (false);
drop policy if exists erp_fiscal_liberacao_atualizacao_bloqueada on public.erp_fiscal_liberacoes_pedido_item;
create policy erp_fiscal_liberacao_atualizacao_bloqueada on public.erp_fiscal_liberacoes_pedido_item
  for update to authenticated using (false) with check (false);
drop policy if exists erp_fiscal_liberacao_exclusao_bloqueada on public.erp_fiscal_liberacoes_pedido_item;
create policy erp_fiscal_liberacao_exclusao_bloqueada on public.erp_fiscal_liberacoes_pedido_item
  for delete to authenticated using (false);

-- ---------------------------------------------------------------------------
-- 2 · RPC chamada pela Central Fiscal.
-- ---------------------------------------------------------------------------
create or replace function public.erp_liberar_item_fiscal(
  p_pedido_item_id uuid,
  p_quantidade numeric,
  p_tipo text,
  p_observacao text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_nome text;
  v_master boolean;
  v_perfil text;
  v_item record;
  v_liberado numeric := 0;
  v_saldo numeric;
  v_tipo_final text;
begin
  if auth.uid() is null then
    raise exception 'Sessão de autenticação obrigatória' using errcode = '42501';
  end if;

  if p_pedido_item_id is null then
    raise exception 'O item do pedido deve ser informado' using errcode = '22023';
  end if;

  if p_quantidade is null
     or p_quantidade::text in ('NaN', 'Infinity', '-Infinity')
     or p_quantidade <= 0 then
    raise exception 'A quantidade liberada deve ser maior que zero' using errcode = '22023';
  end if;

  if p_tipo is not null and btrim(p_tipo) <> '' and btrim(lower(p_tipo)) not in ('total', 'parcial') then
    raise exception 'O tipo de liberação deve ser total ou parcial' using errcode = '22023';
  end if;

  select u.id, u.nome, upper(btrim(coalesce(u.perfil, ''))),
         (u.is_master is true
          and coalesce(u.nivel_admin, 0) >= 100
          and upper(btrim(coalesce(u.perfil, ''))) = 'MASTER'
          and u.empresa_id is null
          and u.setor_id is null)
    into v_usuario_id, v_usuario_nome, v_perfil, v_master
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.ativo = true
     and u.deleted_at is null
   limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não localizado para esta sessão' using errcode = '42501';
  end if;

  if not v_master
     and v_perfil not in ('ADMINISTRADOR', 'CONTROLADORIA', 'FISCAL')
     and not public.erp_has_permission('fiscal', 'liberar') then
    raise exception 'Sem permissão para liberar item fiscal' using errcode = '42501';
  end if;

  if v_empresa_id is null and not v_master then
    raise exception 'Empresa da sessão não identificada' using errcode = '42501';
  end if;

  -- Trava o item e lê o pedido-pai no mesmo escopo de tenant.
  select i.id, i.pedido_id, i.empresa_id, i.quantidade, i.descricao,
         p.numero, p.status
    into v_item
    from public.erp_pedidos_venda_itens i
    join public.erp_pedidos_venda p on p.id = i.pedido_id
   where i.id = p_pedido_item_id
     and (v_master or i.empresa_id = v_empresa_id)
     for update of i
   limit 1;

  if not found then
    raise exception 'Item do pedido não encontrado nesta empresa' using errcode = 'P0001';
  end if;

  if lower(trim(coalesce(v_item.status, ''))) in ('rascunho', 'aberto', 'cotação', 'cotacao') then
    raise exception 'Pedido ainda está em fase comercial; liberação fiscal exige pedido confirmado' using errcode = '42501';
  end if;
  if lower(trim(coalesce(v_item.status, ''))) like 'cancel%' then
    raise exception 'Pedido cancelado não pode receber liberação fiscal' using errcode = '42501';
  end if;

  if v_item.quantidade is null or v_item.quantidade <= 0 then
    raise exception 'O item do pedido não tem quantidade válida para liberar' using errcode = '22023';
  end if;

  select coalesce(sum(l.quantidade), 0)
    into v_liberado
    from public.erp_fiscal_liberacoes_pedido_item l
   where l.pedido_item_id = v_item.id
     and l.empresa_id = v_item.empresa_id;

  v_saldo := v_item.quantidade - v_liberado;

  if v_saldo <= 0 then
    raise exception 'O saldo deste item já foi totalmente liberado' using errcode = '22023';
  end if;

  if p_quantidade > v_saldo then
    raise exception 'Quantidade informada (%) excede o saldo pendente (%) do item', p_quantidade, v_saldo
      using errcode = '22023';
  end if;

  -- O tipo gravado é o do saldo real: se o cliente pediu "parcial" mas a
  -- quantidade fecha o saldo, o que existe é uma liberação total.
  v_tipo_final := case when p_quantidade >= v_saldo then 'total' else 'parcial' end;

  insert into public.erp_fiscal_liberacoes_pedido_item (
    empresa_id, pedido_id, pedido_item_id, quantidade, tipo, observacao,
    usuario_id, usuario_nome
  )
  values (
    v_item.empresa_id, v_item.pedido_id, v_item.id, p_quantidade, v_tipo_final,
    nullif(btrim(coalesce(p_observacao, '')), ''),
    v_usuario_id, v_usuario_nome
  );

  insert into public.erp_logs_sistema (
    empresa_id, usuario_id, modulo, acao, entidade, entidade_id, dados
  )
  values (
    v_item.empresa_id, v_usuario_id, 'Fiscal', 'ITEM_FISCAL_LIBERADO',
    'erp_pedidos_venda_itens', v_item.id,
    jsonb_build_object(
      'pedido_id', v_item.pedido_id,
      'pedido_numero', v_item.numero,
      'pedido_status', v_item.status,
      'descricao', v_item.descricao,
      'quantidade_item', v_item.quantidade,
      'quantidade_liberada', p_quantidade,
      'liberado_anteriormente', v_liberado,
      'saldo_restante', v_saldo - p_quantidade,
      'tipo', v_tipo_final,
      'observacao', nullif(btrim(coalesce(p_observacao, '')), '')
    )
  );

  return jsonb_build_object(
    'pedido_item_id', v_item.id,
    'pedido_id', v_item.pedido_id,
    'quantidade_item', v_item.quantidade,
    'quantidade_liberada', p_quantidade,
    'liberado_total', v_liberado + p_quantidade,
    'saldo_restante', v_saldo - p_quantidade,
    'tipo', v_tipo_final
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3 · Superfície de execução. Os revokes publicados em 20260921180000:6 e
--     20260925170000:7 valem para esta mesma assinatura; reaplicados aqui para
--     que o estado final não dependa da ordem de aplicação.
-- ---------------------------------------------------------------------------
revoke all on function public.erp_liberar_item_fiscal(uuid, numeric, text, text) from public, anon;
grant execute on function public.erp_liberar_item_fiscal(uuid, numeric, text, text) to authenticated;
revoke all on table public.erp_fiscal_liberacoes_pedido_item from public, anon;
grant select on table public.erp_fiscal_liberacoes_pedido_item to authenticated;

comment on function public.erp_liberar_item_fiscal(uuid, numeric, text, text) is
  'Registra a liberação fiscal de uma quantidade de um item de pedido de venda da empresa da sessão, valida o saldo pela soma das liberações anteriores e grava a trilha em erp_logs_sistema. Não baixa estoque, não emite documento fiscal e não altera o status do pedido.';

commit;
