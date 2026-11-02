-- SYSNQRA ERP & SGQ INDUSTRIAL
-- Revisão 1.0 | 01/11/2026 | Fernando Schuinsekel
-- Baixa de matéria-prima POR LOTE, atravessando vários lotes quando um só não cobre, e rastreabilidade
-- lote/NF -> ordens de produção -> peças produzidas.
--
-- Fatos que esta migration corrige (todos lidos nas migrations deste repositório):
--   1. O recebimento por NF-e grava o lote em erp_estoque_lotes_rastreabilidade
--      (fn_receber_lote_almoxarifado: 20260927160100:13 e 20261020170000:49). NENHUM caminho do sistema
--      insere em erp_estoque_lotes; aquela tabela é lida por tela mas nunca escrita.
--   2. A saída manual (erp_estoque_registrar_movimento: 20261006153000:36) grava o movimento sem lote.
--   3. A baixa do erp_produtos.estoque_atual é feita pela trigger trg_erp_estoque_aplicar_movimento
--      (20260912200000:20-33), que trata 'saida', 'venda' e 'consumo' como negativa. Portanto nenhuma
--      função daqui toca em estoque_atual: faria a baixa em dobro.
--   4. erp_estoque_movimentos não tinha coluna de lote, então não havia como provar depois qual lote
--      alimentou cada ordem. As tabelas de genealogia de 20260927231000 e 20261019190000 nunca receberam
--      um INSERT.
--
-- Regra de aloção: o padrão é 'entrada', ou seja o LOTE MAIS ANTIGO sai primeiro, porque o proprietário
-- pediu "dar sempre baixa do lote antigo" e "vai dar baixa no primeiro lote". O critério alternativo
-- 'validade' (vence primeiro) existe porque matéria-prima com validade curiosa não pode esperar; ele é
-- escolhido na tela, grava junto do movimento e não muda o comportamento padrão.
begin;

-- 1. Elo do movimento com o lote consumido. Só adiciona colunas; não reescreve histórico.
alter table public.erp_estoque_movimentos
  add column if not exists lote_id uuid,
  add column if not exists lote_numero text,
  add column if not exists pedido_interno text;

do $$ begin
  if exists (select 1 from information_schema.tables
              where table_schema='public' and table_name='erp_estoque_lotes_rastreabilidade')
     and not exists (select 1 from pg_constraint where conname='erp_estoque_movimentos_lote_id_fkey') then
    alter table public.erp_estoque_movimentos
      add constraint erp_estoque_movimentos_lote_id_fkey
      foreign key (lote_id) references public.erp_estoque_lotes_rastreabilidade(id) on delete restrict;
  end if;
end $$;

create index if not exists ix_erp_estoque_movimentos_lote
  on public.erp_estoque_movimentos (empresa_id, lote_id, created_at);
create index if not exists ix_erp_estoque_movimentos_pedido_interno
  on public.erp_estoque_movimentos (empresa_id, pedido_interno) where pedido_interno is not null;

-- 2. Lotes disponíveis de uma matéria-prima, digitando o código do produto.
--    É security definer por dois motivos: resolve codigo -> produto_id no servidor e não depende de
--    política de SELECT da tabela de rastreabilidade para funcionar.
create or replace function public.erp_lote_saldos_por_material(p_material_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_codigo text := nullif(btrim(coalesce(p_material_codigo,'')),'');
  v_produto jsonb;
  v_lotes jsonb;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode='42501';
  end if;
  if v_codigo is null then
    raise exception 'Informe o código da matéria-prima.' using errcode='22023';
  end if;

  select jsonb_build_object(
           'produto_id', pr.id,
           'codigo', pr.codigo,
           'nome', pr.nome,
           'unidade', pr.unidade,
           'estoque_atual', pr.estoque_atual,
           'ativo', pr.ativo
         )
    into v_produto
    from public.erp_produtos pr
   where pr.empresa_id = v_empresa
     and lower(btrim(pr.codigo)) = lower(v_codigo)
   limit 1;

  if v_produto is null then
    return jsonb_build_object('encontrado', false, 'codigo', v_codigo,
                              'mensagem', 'Nenhuma matéria-prima com este código na sua empresa.');
  end if;

  select jsonb_build_object(
           'total_em_lotes', coalesce(sum(l.quantidade_disponivel), 0),
           'quantidade_lotes', count(*),
           'lotes', coalesce(jsonb_agg(jsonb_build_object(
             'lote_id', l.id,
             'lote_numero', l.lote_fornecedor,
             'nf_numero', l.nf_numero,
             'quantidade_disponivel', l.quantidade_disponivel,
             'quantidade_inicial', l.quantidade_inicial,
             'data_validade', l.data_validade,
             'data_entrada', l.created_at,
             'status_qualidade', l.status_qualidade
           ) order by l.created_at asc, l.lote_fornecedor asc), '[]'::jsonb)
         )
    into v_lotes
    from public.erp_estoque_lotes_rastreabilidade l
   where l.empresa_id = v_empresa
     and l.produto_id = (v_produto ->> 'produto_id')::uuid
     and l.status_qualidade = 'APROVADO'
     and l.quantidade_disponivel > 0;

  return v_produto || v_lotes || jsonb_build_object('encontrado', true, 'critério', 'entrada');
end;
$$;

revoke all on function public.erp_lote_saldos_por_material(text) from public, anon;
grant execute on function public.erp_lote_saldos_por_material(text) to authenticated;

-- 3. Prévia da alocação: em quais lotes a baixa vai cair, quanto de cada, ANTES de gravar qualquer coisa.
create or replace function public.erp_lote_planejar_baixa(
  p_produto_id uuid,
  p_quantidade numeric,
  p_criterio text default 'entrada'
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_criterio text := lower(coalesce(nullif(btrim(p_criterio),''),'entrada'));
  v_restante numeric := coalesce(p_quantidade, 0);
  v_disponivel_total numeric := 0;
  v_lote record;
  v_tira numeric;
  v_lotes jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode='42501';
  end if;
  if p_produto_id is null or coalesce(p_quantidade,0) <= 0 then
    raise exception 'Matéria-prima e quantidade positiva são obrigatórios.' using errcode='22023';
  end if;
  if v_criterio not in ('entrada','validade') then
    raise exception 'Critério de baixa inválido: use entrada ou validade.' using errcode='22023';
  end if;

  for v_lote in
    select l.id, l.lote_fornecedor, l.nf_numero, l.quantidade_disponivel, l.data_validade, l.created_at
      from public.erp_estoque_lotes_rastreabilidade l
     where l.empresa_id = v_empresa
       and l.produto_id = p_produto_id
       and l.status_qualidade = 'APROVADO'
       and l.quantidade_disponivel > 0
     order by
       case when v_criterio = 'validade'
            then coalesce(l.data_validade, date '9999-12-31') end asc,
       l.created_at asc,
       l.lote_fornecedor asc
  loop
    v_disponivel_total := v_disponivel_total + v_lote.quantidade_disponivel;
    continue when v_restante <= 0;
    v_tira := least(v_restante, v_lote.quantidade_disponivel);
    v_lotes := v_lotes || jsonb_build_object(
      'lote_id', v_lote.id,
      'lote_numero', v_lote.lote_fornecedor,
      'nf_numero', v_lote.nf_numero,
      'quantidade_baixar', v_tira,
      'saldo_atual_lote', v_lote.quantidade_disponivel,
      'saldo_restante_lote', v_lote.quantidade_disponivel - v_tira,
      'data_validade', v_lote.data_validade,
      'data_entrada', v_lote.created_at
    );
    v_restante := v_restante - v_tira;
  end loop;

  return jsonb_build_object(
    'produto_id', p_produto_id,
    'criterio', v_criterio,
    'quantidade_pedida', p_quantidade,
    'saldo_em_lotes', v_disponivel_total,
    'cobre_a_baixa', v_restante <= 0,
    'faltante', greatest(v_restante, 0),
    'lotes_atingidos', jsonb_array_length(v_lotes),
    'lotes', v_lotes
  );
end;
$$;

revoke all on function public.erp_lote_planejar_baixa(uuid, numeric, text) from public, anon;
grant execute on function public.erp_lote_planejar_baixa(uuid, numeric, text) to authenticated;

-- 4. A baixa em si: um pedido interno, N fatias de lote, um movimento por fatia.
create or replace function public.erp_lote_baixar_por_fifo(
  p_produto_id uuid,
  p_quantidade numeric,
  p_pedido_interno text,
  p_ordem_producao_id uuid default null,
  p_criterio text default 'entrada',
  p_observacao text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_criterio text := lower(coalesce(nullif(btrim(p_criterio),''),'entrada'));
  v_pedido text := nullif(btrim(coalesce(p_pedido_interno,'')),'');
  v_saldo_produto numeric;
  v_restante numeric := coalesce(p_quantidade, 0);
  v_baixado numeric := 0;
  v_lote record;
  v_tira numeric;
  v_movimento uuid;
  v_baixas jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode='42501';
  end if;
  if v_empresa is null then
    raise exception 'Empresa de trabalho não identificada.' using errcode='42501';
  end if;
  if not public.erp_has_permission('estoque','movimentar') then
    raise exception 'Usuário sem permissão estoque.movimentar.' using errcode='42501';
  end if;
  if p_produto_id is null or coalesce(p_quantidade,0) <= 0 then
    raise exception 'Matéria-prima e quantidade positiva são obrigatórios.' using errcode='22023';
  end if;
  if v_pedido is null then
    raise exception 'Informe o pedido interno que consome a matéria-prima.' using errcode='22023';
  end if;
  if v_criterio not in ('entrada','validade') then
    raise exception 'Critério de baixa inválido: use entrada ou validade.' using errcode='22023';
  end if;
  if not exists (select 1 from public.erp_produtos pr
                  where pr.id = p_produto_id and pr.empresa_id = v_empresa and pr.ativo = true) then
    raise exception 'Matéria-prima inexistente, inativa ou de outra empresa.' using errcode='42501';
  end if;
  if p_ordem_producao_id is not null and not exists (
       select 1 from public.erp_ordens_producao op
        where op.id = p_ordem_producao_id and op.empresa_id = v_empresa) then
    raise exception 'Ordem de produção informada não pertence à sua empresa.' using errcode='42501';
  end if;

  -- trava a linha do produto: dois almoxarifes não podem baixar o mesmo lote ao mesmo tempo
  select pr.estoque_atual into v_saldo_produto
    from public.erp_produtos pr
   where pr.id = p_produto_id and pr.empresa_id = v_empresa
     for update;

  if coalesce(v_saldo_produto, 0) < p_quantidade then
    raise exception using errcode='22023', message = format('Saldo insuficiente: o estoque atual de %s é %s e a baixa pedida é %s. Nada foi gravado.',
        (select lower(btrim(pr.codigo)) from public.erp_produtos pr where pr.id = p_produto_id),
        trim(to_char(coalesce(v_saldo_produto,0),'FM999999999990.999')),
        trim(to_char(p_quantidade,'FM999999999990.999')));
  end if;

  for v_lote in
    select l.id, l.lote_fornecedor, l.nf_numero, l.quantidade_disponivel, l.data_validade
      from public.erp_estoque_lotes_rastreabilidade l
     where l.empresa_id = v_empresa
       and l.produto_id = p_produto_id
       and l.status_qualidade = 'APROVADO'
       and l.quantidade_disponivel > 0
     order by
       case when v_criterio = 'validade'
            then coalesce(l.data_validade, date '9999-12-31') end asc,
       l.created_at asc,
       l.lote_fornecedor asc
     for update of l
  loop
    exit when v_restante <= 0;
    v_tira := least(v_restante, v_lote.quantidade_disponivel);

    update public.erp_estoque_lotes_rastreabilidade
       set quantidade_disponivel = quantidade_disponivel - v_tira
     where id = v_lote.id;

    insert into public.erp_estoque_movimentos(
      empresa_id, produto_id, tipo, quantidade, origem, documento, observacao,
      ordem_producao_id, lote_id, lote_numero, pedido_interno
    ) values (
      v_empresa, p_produto_id, 'consumo', v_tira, 'pedido_interno', v_pedido,
      nullif(btrim(coalesce(p_observacao,'')),''),
      p_ordem_producao_id, v_lote.id, v_lote.lote_fornecedor, v_pedido
    ) returning id into v_movimento;

    v_baixas := v_baixas || jsonb_build_object(
      'movimento_id', v_movimento,
      'lote_id', v_lote.id,
      'lote_numero', v_lote.lote_fornecedor,
      'nf_numero', v_lote.nf_numero,
      'quantidade_baixada', v_tira,
      'saldo_apos', v_lote.quantidade_disponivel - v_tira,
      'data_validade', v_lote.data_validade
    );

    v_restante := v_restante - v_tira;
    v_baixado := v_baixado + v_tira;
  end loop;

  if v_restante > 0 then
    raise exception using errcode='22023', message = format('Lote insuficiente: só existem %s em lotes APROVADOS e a baixa pedida é %s. Nenhum saldo foi alterado.',
        trim(to_char(v_baixado,'FM999999999990.999')),
        trim(to_char(p_quantidade,'FM999999999990.999')));
  end if;

  return jsonb_build_object(
    'empresa_id', v_empresa,
    'produto_id', p_produto_id,
    'pedido_interno', v_pedido,
    'ordem_producao_id', p_ordem_producao_id,
    'criterio', v_criterio,
    'quantidade_pedida', p_quantidade,
    'quantidade_baixada', v_baixado,
    'lotes_atingidos', jsonb_array_length(v_baixas),
    'baixas', v_baixas
  );
end;
$$;

revoke all on function public.erp_lote_baixar_por_fifo(uuid, numeric, text, uuid, text, text) from public, anon;
grant execute on function public.erp_lote_baixar_por_fifo(uuid, numeric, text, uuid, text, text) to authenticated;

-- 5. Rastreabilidade nos dois sentidos a partir do número do lote OU da NF de entrada.
create or replace function public.erp_lote_rastrear(p_referencia text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_ref text := nullif(btrim(coalesce(p_referencia,'')),'');
  v_lotes jsonb;
  v_baixas jsonb;
  v_producao jsonb;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão autenticada obrigatória.' using errcode='42501';
  end if;
  if v_ref is null then
    raise exception 'Informe o número do lote ou da NF.' using errcode='22023';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'lote_id', l.id,
           'lote_numero', l.lote_fornecedor,
           'nf_numero', l.nf_numero,
           'material_codigo', pr.codigo,
           'material_nome', pr.nome,
           'unidade', pr.unidade,
           'quantidade_inicial', l.quantidade_inicial,
           'quantidade_disponivel', l.quantidade_disponivel,
           'status_qualidade', l.status_qualidade,
           'data_validade', l.data_validade,
           'data_entrada', l.created_at
         ) order by l.created_at asc), '[]'::jsonb)
    into v_lotes
    from public.erp_estoque_lotes_rastreabilidade l
    join public.erp_produtos pr on pr.id = l.produto_id
   where l.empresa_id = v_empresa
     and (l.lote_fornecedor ilike '%' || v_ref || '%' or coalesce(l.nf_numero,'') ilike '%' || v_ref || '%');

  select coalesce(jsonb_agg(jsonb_build_object(
           'movimento_id', m.id,
           'lote_numero', m.lote_numero,
           'material_codigo', mp.codigo,
           'quantidade', m.quantidade,
           'pedido_interno', m.pedido_interno,
           'numero_op', op.numero_op,
           'op_id', m.ordem_producao_id,
           'produto_codigo', pp.codigo,
           'produto_nome', pp.nome,
           'emitido_em', m.created_at
         ) order by m.created_at desc), '[]'::jsonb)
    into v_baixas
    from public.erp_estoque_movimentos m
    join public.erp_produtos mp on mp.id = m.produto_id
    left join public.erp_ordens_producao op on op.id = m.ordem_producao_id
    left join public.erp_produtos pp on pp.id = op.produto_id
   where m.empresa_id = v_empresa
     and m.lote_id in (
       select l2.id from public.erp_estoque_lotes_rastreabilidade l2
        where l2.empresa_id = v_empresa
          and (l2.lote_fornecedor ilike '%' || v_ref || '%' or coalesce(l2.nf_numero,'') ilike '%' || v_ref || '%'));

  select coalesce(jsonb_agg(jsonb_build_object(
           'op_id', ap.ordem_producao_id,
           'numero_op', op.numero_op,
           'lote_apontado', ap.lote,
           'quantidade_boa', ap.quantidade_boa,
           'quantidade_refugada', ap.quantidade_refugada,
           'produto_codigo', pp.codigo,
           'produto_nome', pp.nome,
           'apontado_em', ap.criado_em
         ) order by ap.criado_em desc), '[]'::jsonb)
    into v_producao
    from public.erp_apontamentos_processo ap
    join public.erp_ordens_producao op on op.id = ap.ordem_producao_id
    left join public.erp_produtos pp on pp.id = op.produto_id
   where ap.empresa_id = v_empresa
     and ap.ordem_producao_id in (
       select distinct m.ordem_producao_id
         from public.erp_estoque_movimentos m
        where m.empresa_id = v_empresa
          and m.ordem_producao_id is not null
          and m.lote_id in (
            select l3.id from public.erp_estoque_lotes_rastreabilidade l3
             where l3.empresa_id = v_empresa
               and (l3.lote_fornecedor ilike '%' || v_ref || '%' or coalesce(l3.nf_numero,'') ilike '%' || v_ref || '%')));

  return jsonb_build_object(
    'referencia', v_ref,
    'lotes', v_lotes,
    'baixas', v_baixas,
    'producao', v_producao,
    'quantidade_lotes', jsonb_array_length(v_lotes),
    'quantidade_baixas', jsonb_array_length(v_baixas),
    'quantidade_apontamentos', jsonb_array_length(v_producao)
  );
end;
$$;

revoke all on function public.erp_lote_rastrear(text) from public, anon;
grant execute on function public.erp_lote_rastrear(text) to authenticated;

comment on function public.erp_lote_baixar_por_fifo(uuid, numeric, text, uuid, text, text) is
  'Baixa de matéria-prima por lote: aloca primeiro o lote mais antigo (criterio entrada) ou o que vence '
  'primeiro (criterio validade), grava um movimento por fatia e trava a linha do produto. Não altera '
  'estoque_atual: quem faz isso é trg_erp_estoque_aplicar_movimento.';
comment on function public.erp_lote_rastrear(text) is
  'Rastreabilidade: recebe número de lote ou NF e devolve lotes, baixas por pedido interno e as peças '
  'apontadas nas ordens de produção que consumiram aquele lote.';

commit;
