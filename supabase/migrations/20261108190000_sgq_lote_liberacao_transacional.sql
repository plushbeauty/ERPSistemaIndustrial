-- SYSNQRA ERP INDUSTRIAL
-- SGQ-REL-001 — liberação/bloqueio transacional de lote operacional.
-- Não aplicar remotamente nesta entrega. O proprietário executa após revisão e backup.
-- Idempotente: colunas/índices condicionais, constraints verificadas, policies recriadas,
-- funções CREATE OR REPLACE e GRANT/REVOKE explícitos.

begin;

-- 1) Vincular o parecer SGQ ao lote operacional real, preservando registros históricos.
alter table public.erp_qualidade_liberacao_lotes
  add column if not exists lote_operacional_id uuid;

alter table public.erp_qualidade_liberacao_lotes
  add column if not exists localizacao_anterior text;

alter table public.erp_qualidade_liberacao_lotes
  alter column quantidade type numeric(14,3)
  using quantidade::numeric;

create unique index if not exists uq_erp_estoque_lotes_empresa_id_id
  on public.erp_estoque_lotes (empresa_id, id);

create index if not exists idx_erp_qualidade_liberacao_lotes_operacional
  on public.erp_qualidade_liberacao_lotes (empresa_id, lote_operacional_id);

create unique index if not exists uq_erp_qualidade_liberacao_lotes_operacional
  on public.erp_qualidade_liberacao_lotes (empresa_id, lote_operacional_id)
  where lote_operacional_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'erp_qualidade_liberacao_lotes_operacional_fk'
      and conrelid = 'public.erp_qualidade_liberacao_lotes'::regclass
  ) then
    alter table public.erp_qualidade_liberacao_lotes
      add constraint erp_qualidade_liberacao_lotes_operacional_fk
      foreign key (empresa_id, lote_operacional_id)
      references public.erp_estoque_lotes (empresa_id, id)
      on delete restrict;
  end if;
end;
$$;

-- A tabela documental passa a ser somente leitura pelo cliente.
-- Escritas são feitas exclusivamente pelas RPCs SECURITY DEFINER abaixo.
drop policy if exists erp_qualidade_liberacao_lotes_insert_tenant on public.erp_qualidade_liberacao_lotes;
drop policy if exists erp_qualidade_liberacao_lotes_update_tenant on public.erp_qualidade_liberacao_lotes;
grant select on public.erp_qualidade_liberacao_lotes to authenticated;
revoke insert, update, delete on public.erp_qualidade_liberacao_lotes from public, anon, authenticated;

-- 2) Função interna: valida tenant/identidade/nivel_admin, altera o lote operacional,
-- registra o parecer e grava a trilha SGQ na mesma transação.
create or replace function public.erp_qualidade_lote_decidir(
  p_lote_operacional_id uuid,
  p_status text,
  p_observacoes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_usuario_id uuid;
  v_nivel_admin integer;
  v_lote public.erp_estoque_lotes%rowtype;
  v_registro public.erp_qualidade_liberacao_lotes%rowtype;
  v_tem_registro boolean := false;
  v_localizacao_anterior text;
  v_antes_lote jsonb;
  v_antes_registro jsonb;
  v_depois jsonb;
begin
  if p_lote_operacional_id is null then
    raise exception 'LOTE_OPERACIONAL_OBRIGATORIO';
  end if;
  if p_status not in ('APROVADO', 'REPROVADO') then
    raise exception 'DECISAO_DE_LOTE_INVALIDA';
  end if;

  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'EMPRESA_NAO_IDENTIFICADA';
  end if;

  select u.id, u.nivel_admin
    into v_usuario_id, v_nivel_admin
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo is true
     and u.deleted_at is null
   limit 1;

  if not found then
    raise exception 'USUARIO_ATIVO_DA_EMPRESA_NAO_ENCONTRADO';
  end if;

  -- O contrato de identidade do ERP classifica ADMIN a partir de nivel_admin >= 8.
  if coalesce(v_nivel_admin, 0) < 8 then
    raise exception 'NIVEL_ADMIN_INSUFICIENTE_PARA_DECISAO_DE_LOTE';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_empresa::text || ':' || p_lote_operacional_id::text, 0)
  );

  select l.*
    into v_lote
    from public.erp_estoque_lotes l
   where l.id = p_lote_operacional_id
     and l.empresa_id = v_empresa
   for update;

  if not found then
    raise exception 'LOTE_NAO_PERTENCE_A_EMPRESA_ATUAL';
  end if;

  if coalesce(v_lote.quantidade_recebida, 0) <= 0 then
    raise exception 'LOTE_SEM_QUANTIDADE_RECEBIDA';
  end if;

  if not exists (
    select 1
      from public.erp_produtos p
     where p.id = v_lote.produto_id
       and p.empresa_id = v_empresa
  ) then
    raise exception 'PRODUTO_DO_LOTE_NAO_PERTENCE_A_EMPRESA';
  end if;

  v_antes_lote := to_jsonb(v_lote);

  select r.*
    into v_registro
    from public.erp_qualidade_liberacao_lotes r
   where r.empresa_id = v_empresa
     and (r.lote_operacional_id = p_lote_operacional_id
       or r.codigo_lote = v_lote.lote_interno)
   order by case when r.lote_operacional_id = p_lote_operacional_id then 0 else 1 end
   limit 1
   for update;

  v_tem_registro := found;
  if v_tem_registro then
    v_antes_registro := to_jsonb(v_registro);
    if v_registro.lote_operacional_id is not null
       and v_registro.lote_operacional_id <> p_lote_operacional_id then
      raise exception 'CODIGO_DE_LOTE_JA_VINCULADO_A_OUTRO_LOTE_OPERACIONAL';
    end if;
    if v_registro.codigo_lote <> v_lote.lote_interno then
      raise exception 'CODIGO_DO_LOTE_DIVERGE_DO_REGISTRO_SGQ';
    end if;
  else
    v_antes_registro := null;
  end if;

  if p_status = 'REPROVADO' then
    v_localizacao_anterior := coalesce(
      v_registro.localizacao_anterior,
      nullif(v_lote.localizacao, 'Quarentena')
    );
    update public.erp_estoque_lotes
       set status_inspecao = 'REPROVADO',
           localizacao = 'Quarentena'
     where id = p_lote_operacional_id
       and empresa_id = v_empresa;
  else
    v_localizacao_anterior := null;
    update public.erp_estoque_lotes
       set status_inspecao = 'APROVADO',
           localizacao = case
             when localizacao = 'Quarentena'
               and v_registro.localizacao_anterior is not null
             then v_registro.localizacao_anterior
             else localizacao
           end
     where id = p_lote_operacional_id
       and empresa_id = v_empresa;
  end if;

  select l.*
    into v_lote
    from public.erp_estoque_lotes l
   where l.id = p_lote_operacional_id
     and l.empresa_id = v_empresa;

  if v_tem_registro then
    update public.erp_qualidade_liberacao_lotes
       set lote_operacional_id = p_lote_operacional_id,
           quantidade = v_lote.quantidade_recebida,
           status_sgq = p_status,
           responsavel_liberacao = v_usuario_id::text,
           observacoes = coalesce(nullif(trim(p_observacoes), ''), observacoes),
           localizacao_anterior = v_localizacao_anterior,
           updated_at = now()
     where id = v_registro.id
       and empresa_id = v_empresa
     returning * into v_registro;
  else
    insert into public.erp_qualidade_liberacao_lotes (
      empresa_id,
      codigo_lote,
      produto_id,
      quantidade,
      status_sgq,
      responsavel_liberacao,
      observacoes,
      criado_por,
      lote_operacional_id,
      localizacao_anterior
    ) values (
      v_empresa,
      v_lote.lote_interno,
      v_lote.produto_id,
      v_lote.quantidade_recebida,
      p_status,
      v_usuario_id::text,
      nullif(trim(p_observacoes), ''),
      auth.uid(),
      p_lote_operacional_id,
      v_localizacao_anterior
    )
    returning * into v_registro;
  end if;

  v_depois := jsonb_build_object(
    'lote_operacional', to_jsonb(v_lote),
    'parecer_sgq', to_jsonb(v_registro)
  );

  insert into public.erp_sgq_auditoria (
    empresa_id, entidade, entidade_id, operacao, ator_id, antes, depois
  ) values (
    v_empresa,
    'erp_qualidade_liberacao_lotes',
    v_registro.id,
    case when v_tem_registro then 'UPDATE' else 'INSERT' end,
    v_usuario_id,
    jsonb_build_object('lote_operacional', v_antes_lote, 'parecer_sgq', v_antes_registro),
    v_depois
  );

  return jsonb_build_object('registro', to_jsonb(v_registro), 'lote', to_jsonb(v_lote));
end;
$$;

-- 3) RPCs públicas da tela. Ambas usam a mesma transação e trilha de auditoria.
create or replace function public.erp_liberar_lote(
  p_lote_operacional_id uuid,
  p_observacoes text default null
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.erp_qualidade_lote_decidir(p_lote_operacional_id, 'APROVADO', p_observacoes);
$$;

create or replace function public.erp_bloquear_lote(
  p_lote_operacional_id uuid,
  p_observacoes text default null
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.erp_qualidade_lote_decidir(p_lote_operacional_id, 'REPROVADO', p_observacoes);
$$;

revoke all on function public.erp_qualidade_lote_decidir(uuid, text, text) from public, anon, authenticated;
revoke all on function public.erp_liberar_lote(uuid, text) from public, anon;
revoke all on function public.erp_bloquear_lote(uuid, text) from public, anon;
grant execute on function public.erp_liberar_lote(uuid, text) to authenticated;
grant execute on function public.erp_bloquear_lote(uuid, text) to authenticated;

-- 4) Impedir que a separação consuma lote não aprovado ou ainda localizado em quarentena.
create or replace function public.erp_estoque_separar_material(
  p_ordem_id uuid,
  p_produto_id uuid,
  p_lote_id uuid,
  p_quantidade numeric
)
returns table (
  separacao_id uuid,
  codigo_rastreabilidade text
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid;
  v_usuario uuid;
  v_separacao uuid;
  v_codigo text;
  v_lote_produto uuid;
  v_disponivel numeric;
  v_status_inspecao text;
  v_localizacao text;
begin
  v_empresa := public.erp_current_empresa_id();
  v_usuario := public.erp_current_user_id();

  if v_empresa is null or v_usuario is null then
    raise exception 'Sessão ERP/empresa não identificada.';
  end if;

  if not public.erp_has_permission('estoque.movimentar') then
    raise exception 'Usuário sem permissão estoque.movimentar.';
  end if;

  if p_ordem_id is null or p_produto_id is null or coalesce(p_quantidade, 0) <= 0 then
    raise exception 'OP, produto e quantidade são obrigatórios.';
  end if;

  if not exists (
    select 1
      from public.erp_ordens_producao op
     where op.id = p_ordem_id
       and op.empresa_id = v_empresa
  ) then
    raise exception 'Ordem de produção não pertence à empresa atual.';
  end if;

  if not exists (
    select 1
      from public.erp_produtos p
     where p.id = p_produto_id
       and p.empresa_id = v_empresa
       and p.ativo = true
  ) then
    raise exception 'Produto inválido para a empresa atual.';
  end if;

  if p_lote_id is not null then
    select l.produto_id, l.quantidade_disponivel, l.status_inspecao, l.localizacao
      into v_lote_produto, v_disponivel, v_status_inspecao, v_localizacao
      from public.erp_estoque_lotes l
     where l.id = p_lote_id
       and l.empresa_id = v_empresa
     for update;

    if not found then
      raise exception 'Lote não pertence à empresa atual.';
    end if;

    if v_lote_produto <> p_produto_id then
      raise exception 'Lote informado não pertence ao produto selecionado.';
    end if;

    if coalesce(v_status_inspecao, 'AGUARDANDO') <> 'APROVADO' then
      raise exception 'Lote sem liberação da Qualidade. Status de inspeção: %.', coalesce(v_status_inspecao, 'AGUARDANDO');
    end if;

    if upper(trim(coalesce(v_localizacao, ''))) = 'QUARENTENA' then
      raise exception 'Lote aprovado, mas ainda localizado em quarentena. Movimente-o para endereço liberado antes da separação.';
    end if;

    if coalesce(v_disponivel, 0) < p_quantidade then
      raise exception 'Quantidade superior ao saldo disponível do lote.';
    end if;
  end if;

  insert into public.erp_estoque_separacoes (
    empresa_id, ordem_producao_id, produto_id, lote_id, quantidade, status, codigo_barras
  ) values (
    v_empresa, p_ordem_id, p_produto_id, p_lote_id, p_quantidade, 'SEPARADO', null
  )
  returning id into v_separacao;

  v_codigo := 'SEP-' || upper(left(replace(v_separacao::text, '-', ''), 16));

  insert into public.erp_rastreabilidade_cartoes (empresa_id, separacao_id, codigo)
  values (v_empresa, v_separacao, v_codigo);

  return query select v_separacao, v_codigo;
end;
$$;

revoke all on function public.erp_estoque_separar_material(uuid, uuid, uuid, numeric) from public, anon;
grant execute on function public.erp_estoque_separar_material(uuid, uuid, uuid, numeric) to authenticated;

commit;
