-- SYSNQRA ERP INDUSTRIAL
-- @REVISAO: REV-COMPRAS-SOLICITACAO-RPC-20261109-01
-- Ordem do proprietário em 2026-11-09: corrigir a tela de Solicitação de Compra.
-- A RPC estava ausente no banco remoto; a função valida empresa, perfil, permissão,
-- fornecedor e produtos antes de criar cabeçalho e itens na mesma transação.
-- Compatibilidade com o cadastro de solicitações já existente: preserva registros antigos.
alter table public.erp_solicitacoes_compra
  add column if not exists solicitante_id uuid
  references public.erp_usuarios(id) on delete set null;

create index if not exists idx_erp_solicitacoes_compra_solicitante
  on public.erp_solicitacoes_compra(empresa_id, solicitante_id);

create or replace function public.erp_compras_criar_solicitacao(
  p_descricao text,
  p_prioridade text,
  p_email_destino text,
  p_observacoes text,
  p_fornecedor_id uuid,
  p_itens jsonb
)
returns table(id uuid, numero bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_solicitante_id uuid;
  v_solicitacao_id uuid;
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade numeric;
  v_valor_estimado numeric;
  v_descricao text;
begin
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if not public.erp_has_permission('compras', 'criar') then
    raise exception 'Sem permissão para criar solicitações de compra.';
  end if;
  if btrim(coalesce(p_descricao, '')) = '' then
    raise exception 'Informe a descrição da solicitação.';
  end if;
  if lower(coalesce(nullif(btrim(p_prioridade), ''), 'normal')) not in ('normal', 'alta', 'urgente') then
    raise exception 'Prioridade da solicitação inválida.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Adicione pelo menos um item à solicitação.';
  end if;

  select u.id
    into v_solicitante_id
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa_id
     and u.ativo = true
     and u.deleted_at is null
   limit 1;

  if v_solicitante_id is null then
    raise exception 'Perfil ERP ativo não localizado para registrar a solicitação.';
  end if;

  if p_fornecedor_id is not null and not exists (
    select 1
      from public.erp_fornecedores f
     where f.id = p_fornecedor_id
       and f.empresa_id = v_empresa_id
       and f.ativo = true
  ) then
    raise exception 'O fornecedor selecionado não pertence à empresa ativa.';
  end if;

  insert into public.erp_solicitacoes_compra as request (
    empresa_id,
    solicitante_id,
    descricao,
    prioridade,
    requer_autorizacao,
    status,
    email_destino,
    observacoes,
    fornecedor_id
  )
  values (
    v_empresa_id,
    v_solicitante_id,
    btrim(p_descricao),
    lower(coalesce(nullif(btrim(p_prioridade), ''), 'normal')),
    true,
    'aguardando_autorizacao',
    nullif(btrim(p_email_destino), ''),
    nullif(btrim(p_observacoes), ''),
    p_fornecedor_id
  )
  returning request.id into v_solicitacao_id;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_descricao := btrim(coalesce(v_item->>'descricao', ''));
    v_quantidade := nullif(v_item->>'quantidade', '')::numeric;
    v_valor_estimado := coalesce(nullif(v_item->>'valor_estimado', '')::numeric, 0);

    if v_produto_id is null
      or v_descricao = ''
      or v_quantidade is null
      or v_quantidade <= 0
      or v_quantidade::text in ('NaN', 'Infinity', '-Infinity')
      or v_valor_estimado < 0
      or v_valor_estimado::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Item de solicitação inválido.';
    end if;
    if not exists (
      select 1
        from public.erp_produtos p
       where p.id = v_produto_id
         and p.empresa_id = v_empresa_id
         and p.ativo = true
    ) then
      raise exception 'Um produto selecionado não pertence à empresa ativa.';
    end if;

    insert into public.erp_solicitacoes_compra_itens (
      empresa_id,
      solicitacao_id,
      produto_id,
      descricao,
      quantidade,
      unidade,
      valor_estimado
    )
    values (
      v_empresa_id,
      v_solicitacao_id,
      v_produto_id,
      v_descricao,
      v_quantidade,
      coalesce(nullif(btrim(v_item->>'unidade'), ''), 'UN'),
      v_valor_estimado
    );
  end loop;

  return query
    select s.id, s.numero
      from public.erp_solicitacoes_compra s
     where s.id = v_solicitacao_id
       and s.empresa_id = v_empresa_id;
end;
$$;

revoke all on function public.erp_compras_criar_solicitacao(text, text, text, text, uuid, jsonb) from public, anon;
grant execute on function public.erp_compras_criar_solicitacao(text, text, text, text, uuid, jsonb) to authenticated;
