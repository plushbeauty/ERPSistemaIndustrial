/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-02
 * @REVISAO: REV-COMPRAS-PEDIDO-COMPLETO-20261102-01 — cria a RPC erp_compras_salvar_pedido_completo, que o formulário de pedido de compra chama mas nenhuma migration versionada definia
 * @STATUS_APROVACAO: AGUARDA APLICAÇÃO DESTE ARQUIVO SQL PELO PROPRIETÁRIO (só a anon key existe no frontend)
 */

-- ---------------------------------------------------------------------------
-- Fatos verificados antes de escrever este arquivo
--   * src/pages/ComprasPedidoForm.tsx:85 chama
--     supabase.rpc('erp_compras_salvar_pedido_completo', { p_pedido_id,
--     p_fornecedor_id, p_comprador_nome, p_condicao_pagamento, p_prazo_entrega,
--     p_observacoes, p_status, p_itens, p_dados_comerciais }) e lê id + numero
--     da resposta (linhas 108-110). grep em supabase/migrations devolve apenas
--     erp_compras_salvar_pedido (sem o sufixo), definida em
--     20261006090000:333 e redefinida em 20261026120000:18 com 8 parâmetros e
--     sem dados comerciais. A tela, portanto, sempre falhou ao salvar.
--   * Decisão de não reaproveitar erp_compras_salvar_pedido: ela é a função
--     aprovada e em uso por outra rota do módulo, e a regra zero do repositório
--     proíbe redefinir função aprovada para caber uma chamada nova. Esta RPC é
--     aditiva e mantém as mesmas validações, conferidas linha a linha em
--     20261026120000:47-201.
--   * Colunas comerciais do cabeçalho já existem, todas criadas por
--     20261024130000_repair_compras_rest_schema.sql:51-63 (centro_custo,
--     local_entrega, referencia_cotacao, valor_frete, valor_desconto,
--     transportadora, modalidade_frete, numero_contrato,
--     observacoes_recebimento) e requisicao_id na própria criação da tabela
--     (mesmo arquivo, linha 39). Nada de coluna nova no cabeçalho.
--   * Nas linhas do pedido faltam exatamente três campos que a tela envia:
--     ncm, data_entrega_prometida e ordem_producao_id. grep por esses nomes em
--     erp_pedidos_compra_itens não devolve nada. Este arquivo os adiciona.
--   * erp_ordens_producao e erp_requisicoes_compra têm empresa_id
--     (20260910194847:12 cria uq_erp_ordens_producao_empresa_id em
--     (empresa_id,id) e 20260926_industrial_quality_supplyshopfloor_submodules
--     .sql:3 cria erp_requisicoes_compra com empresa_id not null), então os
--     vínculos são conferidos no tenant antes de gravar.
--   * O total do cabeçalho NÃO é calculado aqui: o trigger
--     trg_erp_pedidos_compra_total (20260927183000:81-84, redefinido em
--     20261006090000:308-330) já mantém total = soma dos itens. frete e
--     desconto ficam nas colunas próprias e não entram no total do cabeçalho —
--     é o comportamento aprovado, não foi alterado.
--   * erp_current_empresa_id() e erp_has_permission(modulo,acao) são os
--     helpers canônicos (20260916141000:33-68); a função espelha o
--     security invoker da função irmã para continuar dependendo das policies
--     de erp_pedidos_compra / erp_pedidos_compra_itens.
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- 1 · Campos da linha do pedido que a tela já coleta e o banco não tinha.
-- ---------------------------------------------------------------------------
alter table public.erp_pedidos_compra_itens
  add column if not exists ncm text,
  add column if not exists data_entrega_prometida date,
  add column if not exists ordem_producao_id uuid references public.erp_ordens_producao(id);

create index if not exists idx_erp_pedidos_compra_itens_ordem_producao
  on public.erp_pedidos_compra_itens (empresa_id, ordem_producao_id)
  where ordem_producao_id is not null;

-- ---------------------------------------------------------------------------
-- 2 · RPC do formulário completo: cabeçalho + dados comerciais + itens.
-- ---------------------------------------------------------------------------
create or replace function public.erp_compras_salvar_pedido_completo(
  p_pedido_id uuid,
  p_fornecedor_id uuid,
  p_comprador_nome text,
  p_condicao_pagamento text,
  p_prazo_entrega date,
  p_observacoes text,
  p_status text,
  p_itens jsonb,
  p_dados_comerciais jsonb default '{}'::jsonb
)
returns table(id uuid, numero bigint)
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_comprador_id uuid;
  v_pedido_id uuid;
  v_numero bigint;
  v_comerciais jsonb := coalesce(p_dados_comerciais, '{}'::jsonb);
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade numeric;
  v_preco numeric;
  v_unidade text;
  v_aliquota_ipi numeric;
  v_aliquota_icms numeric;
  v_centro_custo text;
  v_ncm text;
  v_entrega_item text;
  v_ordem_producao_id uuid;
  v_requisicao_id uuid;
  v_valor_frete numeric := 0;
  v_valor_desconto numeric := 0;
  v_produto record;
begin
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;

  if p_status is null or p_status not in ('RASCUNHO', 'PENDENTE_APROVACAO') then
    raise exception 'Status de pedido inválido.';
  end if;

  if p_fornecedor_id is null or not exists (
    select 1 from public.erp_fornecedores f
     where f.id = p_fornecedor_id
       and f.empresa_id = v_empresa_id
       and f.ativo = true
  ) then
    raise exception 'Selecione um fornecedor ativo da empresa.';
  end if;

  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Inclua pelo menos um produto no pedido.';
  end if;

  if jsonb_typeof(v_comerciais) is distinct from 'object' then
    raise exception 'Os dados comerciais devem ser enviados como um objeto.';
  end if;

  if v_comerciais ? 'valor_frete' then
    if jsonb_typeof(v_comerciais->'valor_frete') is distinct from 'number' then
      raise exception 'O valor do frete deve ser numérico.';
    end if;
    v_valor_frete := (v_comerciais->>'valor_frete')::numeric;
    if v_valor_frete < 0 then
      raise exception 'O valor do frete não pode ser negativo.';
    end if;
  end if;

  if v_comerciais ? 'valor_desconto' then
    if jsonb_typeof(v_comerciais->'valor_desconto') is distinct from 'number' then
      raise exception 'O valor do desconto deve ser numérico.';
    end if;
    v_valor_desconto := (v_comerciais->>'valor_desconto')::numeric;
    if v_valor_desconto < 0 then
      raise exception 'O valor do desconto não pode ser negativo.';
    end if;
  end if;

  v_requisicao_id := nullif(btrim(coalesce(v_comerciais->>'requisicao_id', '')), '')::uuid;
  if v_requisicao_id is not null and not exists (
    select 1 from public.erp_requisicoes_compra r
     where r.id = v_requisicao_id
       and r.empresa_id = v_empresa_id
  ) then
    raise exception 'A requisição vinculada não pertence à empresa da sessão.';
  end if;

  select u.id
    into v_comprador_id
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa_id
     and u.ativo = true
     and u.deleted_at is null
   limit 1;
  if v_comprador_id is null then
    raise exception 'Perfil ERP ativo não localizado para registrar o comprador.';
  end if;

  if p_pedido_id is null then
    if not public.erp_has_permission('compras', 'criar') then
      raise exception 'Sem permissão para criar pedidos de compra.';
    end if;

    insert into public.erp_pedidos_compra (
      empresa_id, fornecedor_id, requisicao_id, comprador_id, comprador_nome,
      condicao_pagamento, prazo_entrega, observacoes, status,
      centro_custo, local_entrega, referencia_cotacao,
      valor_frete, valor_desconto, transportadora, modalidade_frete,
      numero_contrato, observacoes_recebimento
    )
    values (
      v_empresa_id, p_fornecedor_id, v_requisicao_id, v_comprador_id,
      nullif(btrim(p_comprador_nome), ''),
      nullif(btrim(p_condicao_pagamento), ''),
      p_prazo_entrega,
      nullif(btrim(p_observacoes), ''),
      p_status,
      nullif(btrim(coalesce(v_comerciais->>'centro_custo', '')), ''),
      nullif(btrim(coalesce(v_comerciais->>'local_entrega', '')), ''),
      nullif(btrim(coalesce(v_comerciais->>'referencia_cotacao', '')), ''),
      v_valor_frete, v_valor_desconto,
      nullif(btrim(coalesce(v_comerciais->>'transportadora', '')), ''),
      nullif(btrim(coalesce(v_comerciais->>'modalidade_frete', '')), ''),
      nullif(btrim(coalesce(v_comerciais->>'numero_contrato', '')), ''),
      nullif(btrim(coalesce(v_comerciais->>'observacoes_recebimento', '')), '')
    )
    returning erp_pedidos_compra.id, erp_pedidos_compra.numero
         into v_pedido_id, v_numero;
  else
    if not public.erp_has_permission('compras', 'editar') then
      raise exception 'Sem permissão para editar pedidos de compra.';
    end if;

    perform 1
      from public.erp_pedidos_compra p
     where p.id = p_pedido_id
       and p.empresa_id = v_empresa_id
       and p.status in ('RASCUNHO', 'PENDENTE_APROVACAO')
     for update;
    if not found then
      raise exception 'Pedido não encontrado ou não pode mais ser editado.';
    end if;

    update public.erp_pedidos_compra p
       set fornecedor_id = p_fornecedor_id,
           requisicao_id = v_requisicao_id,
           comprador_id = v_comprador_id,
           comprador_nome = nullif(btrim(p_comprador_nome), ''),
           condicao_pagamento = nullif(btrim(p_condicao_pagamento), ''),
           prazo_entrega = p_prazo_entrega,
           observacoes = nullif(btrim(p_observacoes), ''),
           status = p_status,
           centro_custo = nullif(btrim(coalesce(v_comerciais->>'centro_custo', '')), ''),
           local_entrega = nullif(btrim(coalesce(v_comerciais->>'local_entrega', '')), ''),
           referencia_cotacao = nullif(btrim(coalesce(v_comerciais->>'referencia_cotacao', '')), ''),
           valor_frete = v_valor_frete,
           valor_desconto = v_valor_desconto,
           transportadora = nullif(btrim(coalesce(v_comerciais->>'transportadora', '')), ''),
           modalidade_frete = nullif(btrim(coalesce(v_comerciais->>'modalidade_frete', '')), ''),
           numero_contrato = nullif(btrim(coalesce(v_comerciais->>'numero_contrato', '')), ''),
           observacoes_recebimento = nullif(btrim(coalesce(v_comerciais->>'observacoes_recebimento', '')), ''),
           updated_at = now()
     where p.id = p_pedido_id
       and p.empresa_id = v_empresa_id
     returning p.id, p.numero into v_pedido_id, v_numero;

    delete from public.erp_pedidos_compra_itens i
     where i.pedido_id = v_pedido_id
       and i.empresa_id = v_empresa_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    if jsonb_typeof(v_item) is distinct from 'object' then
      raise exception 'Cada linha do pedido deve ser um objeto.';
    end if;

    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_quantidade := nullif(v_item->>'quantidade', '')::numeric;
    v_preco := coalesce(nullif(v_item->>'preco_unitario', '')::numeric, 0);
    v_unidade := coalesce(nullif(btrim(v_item->>'unidade'), ''), 'UN');
    v_aliquota_ipi := coalesce(nullif(v_item->>'aliquota_ipi', '')::numeric, 0);
    v_aliquota_icms := coalesce(nullif(v_item->>'aliquota_icms', '')::numeric, 0);
    v_centro_custo := nullif(btrim(v_item->>'centro_custo'), '');
    v_ncm := nullif(btrim(coalesce(v_item->>'ncm', '')), '');
    v_entrega_item := nullif(btrim(coalesce(v_item->>'data_entrega_prometida', '')), '');
    v_ordem_producao_id := nullif(btrim(coalesce(v_item->>'ordem_producao_id', '')), '')::uuid;

    if v_produto_id is null
      or v_quantidade is null
      or v_quantidade <= 0
      or v_quantidade::text in ('NaN', 'Infinity', '-Infinity')
      or v_preco < 0
      or v_preco::text in ('NaN', 'Infinity', '-Infinity')
      or v_aliquota_ipi < 0 or v_aliquota_ipi > 100
      or v_aliquota_icms < 0 or v_aliquota_icms > 100
      or v_aliquota_ipi::text in ('NaN', 'Infinity', '-Infinity')
      or v_aliquota_icms::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Item ou quantidade/preço inválido no pedido.';
    end if;

    if v_ncm is not null and v_ncm !~ '^[0-9]{8,10}$' then
      raise exception 'O NCM do item deve ter de 8 a 10 dígitos, sem máscara.';
    end if;

    if v_entrega_item is not null and v_entrega_item !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      raise exception 'A data de entrega prometida do item deve estar no formato AAAA-MM-DD.';
    end if;

    if v_ordem_producao_id is not null and not exists (
      select 1 from public.erp_ordens_producao o
       where o.id = v_ordem_producao_id
         and o.empresa_id = v_empresa_id
    ) then
      raise exception 'A ordem de produção vinculada não pertence à empresa da sessão.';
    end if;

    select p.id, p.codigo, p.nome
      into v_produto
      from public.erp_produtos p
     where p.id = v_produto_id
       and p.empresa_id = v_empresa_id
       and p.ativo = true;
    if not found then
      raise exception 'Um produto selecionado não pertence à empresa ativa.';
    end if;

    insert into public.erp_pedidos_compra_itens (
      empresa_id, pedido_id, produto_id, codigo_produto, descricao_produto,
      quantidade, unidade, preco_unitario, aliquota_ipi, aliquota_icms,
      centro_custo, ncm, data_entrega_prometida, ordem_producao_id
    )
    values (
      v_empresa_id, v_pedido_id, v_produto_id, v_produto.codigo, v_produto.nome,
      v_quantidade, v_unidade, v_preco, v_aliquota_ipi, v_aliquota_icms,
      v_centro_custo, v_ncm, v_entrega_item::date, v_ordem_producao_id
    );
  end loop;

  return query select v_pedido_id, v_numero;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 3 · Superfície de execução: autenticados, sem anon, sem public.
-- ---------------------------------------------------------------------------
revoke all on function public.erp_compras_salvar_pedido_completo(uuid, uuid, text, text, date, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.erp_compras_salvar_pedido_completo(uuid, uuid, text, text, date, text, text, jsonb, jsonb) to authenticated;

comment on function public.erp_compras_salvar_pedido_completo(uuid, uuid, text, text, date, text, text, jsonb, jsonb) is
  'Salva o pedido de completo do formulário de compras: cabeçalho com dados comerciais (frete, desconto, transportadora, modalidade, contrato, local de entrega, referência de cotação, requisição) e itens com alíquotas, NCM, entrega prometida e vínculo de OP. Não aprova, não recebe e não gera título financeiro.';

commit;
