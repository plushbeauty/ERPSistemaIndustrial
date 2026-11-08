-- SYSNQRA ERP INDUSTRIAL | SGQ | Formulário RPNC (modelo SoftExpert), auditorias,
-- pasta virtual de evidências, varredura de recorrência e plano CAPA dinâmico.
-- Autor: FernandoSchu · 2026-10-31
-- Migração 100% aditiva: não altera a RPC erp_sgq_abrir_rpnc, o fluxo da tela
-- aprovada /pageprincipal/qualidade/rpnc nem as políticas de storage existentes.
begin;

-- ---------------------------------------------------------------------------
-- 1 · Programa de auditorias SGQ (escopo/norma, período, auditor líder, status)
-- ---------------------------------------------------------------------------
create table if not exists public.erp_sgq_auditorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo_auditoria text not null,
  escopo text not null,
  objetivo text,
  tipo text not null default 'Interna'
    check (tipo in ('Interna', 'Externa', 'Fornecedor', 'Processo', 'Produto')),
  auditor_lider_id uuid references public.erp_usuarios(id) on delete set null,
  auditor_lider_nome text not null,
  data_inicio date not null,
  data_fim date not null,
  status text not null default 'Planejada'
    check (status in ('Planejada', 'Em Andamento', 'Concluída')),
  observacoes text,
  criado_por uuid references public.erp_usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint erp_sgq_auditorias_codigo_uq unique (empresa_id, codigo_auditoria),
  constraint erp_sgq_auditorias_periodo_ck check (data_fim >= data_inicio)
);

create index if not exists idx_sgq_auditorias_empresa_status
  on public.erp_sgq_auditorias (empresa_id, status, data_inicio desc);
create index if not exists idx_sgq_auditorias_empresa_lider
  on public.erp_sgq_auditorias (empresa_id, auditor_lider_id);

comment on table public.erp_sgq_auditorias is
  'Programa de auditorias de qualidade (norma/ISO, período e auditor líder); base de rastreabilidade do vínculo RPNC-auditoria.';

create or replace function public.erp_sgq_auditoria_normalizar()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_numero bigint;
begin
  if nullif(btrim(new.codigo_auditoria), '') is null then
    insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
      values (new.empresa_id, 'SGQ-AUD-' || to_char(coalesce(new.data_inicio, current_date), 'YYYY'), 1)
      on conflict (empresa_id, chave)
        do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
      returning proximo_valor into v_numero;
    new.codigo_auditoria := 'SGQ-AUD-' || to_char(coalesce(new.data_inicio, current_date), 'YYYY')
      || '-' || lpad(v_numero::text, 5, '0');
  else
    new.codigo_auditoria := btrim(new.codigo_auditoria);
  end if;
  new.escopo := btrim(new.escopo);
  new.auditor_lider_nome := btrim(new.auditor_lider_nome);
  if nullif(new.auditor_lider_nome, '') is null then
    raise exception 'Informe o auditor líder da auditoria.';
  end if;
  new.atualizado_em := now();
  return new;
end
$$;

drop trigger if exists trg_sgq_auditoria_normalizar on public.erp_sgq_auditorias;
create trigger trg_sgq_auditoria_normalizar before insert or update
  on public.erp_sgq_auditorias
  for each row execute function public.erp_sgq_auditoria_normalizar();

drop trigger if exists trg_sgq_auditoria_audit on public.erp_sgq_auditorias;
create trigger trg_sgq_auditoria_audit after insert or update or delete
  on public.erp_sgq_auditorias
  for each row execute function public.erp_sgq_auditar_mutacao();

alter table public.erp_sgq_auditorias enable row level security;

drop policy if exists sgq_auditorias_select on public.erp_sgq_auditorias;
drop policy if exists sgq_auditorias_insert on public.erp_sgq_auditorias;
drop policy if exists sgq_auditorias_update on public.erp_sgq_auditorias;

create policy sgq_auditorias_select on public.erp_sgq_auditorias for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));
create policy sgq_auditorias_insert on public.erp_sgq_auditorias for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'criar'));
create policy sgq_auditorias_update on public.erp_sgq_auditorias for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'));

revoke all on public.erp_sgq_auditorias from anon;
grant select, insert, update on public.erp_sgq_auditorias to authenticated;

-- ---------------------------------------------------------------------------
-- 2 · Vínculo transacional RPNC -> auditoria e pasta virtual de evidências
-- ---------------------------------------------------------------------------
alter table public.erp_rpnc
  add column if not exists sgq_auditoria_id uuid references public.erp_sgq_auditorias(id) on delete restrict,
  add column if not exists sgq_pasta_evidencias text;

create index if not exists idx_erp_rpnc_empresa_auditoria
  on public.erp_rpnc (empresa_id, sgq_auditoria_id) where sgq_auditoria_id is not null;

comment on column public.erp_rpnc.sgq_auditoria_id is
  'Auditoria SGQ que originou a não conformidade (chave de vínculo pedida para rastreabilidade do Bloco K).';
comment on column public.erp_rpnc.sgq_pasta_evidencias is
  'Prefixo privado obrigatório das evidências da RPNC no bucket qualidade-evidencias: {empresa_id}/rpnc_{numero_rpnc}.';

-- Índices de varredura de recorrência por produto e por lote.
create index if not exists idx_erp_rpnc_empresa_produto_data
  on public.erp_rpnc (empresa_id, sgq_produto_id, sgq_data_ocorrencia desc) where sgq_produto_id is not null;
create index if not exists idx_erp_rpnc_empresa_lote
  on public.erp_rpnc (empresa_id, lower(btrim(coalesce(sgq_lote, '')))) where sgq_lote is not null;

-- Anexos individuais de cada ação CAPA, indexados à pasta da RPNC.
alter table public.erp_qualidade_rpnc_evidencias
  add column if not exists acao_id uuid references public.erp_sgq_capa_acoes(id) on delete cascade,
  add column if not exists finalidade text not null default 'Ocorrencia';

comment on column public.erp_qualidade_rpnc_evidencias.acao_id is
  'Ação CAPA à qual o anexo pertence; nulo para evidências da ocorrência.';

-- ---------------------------------------------------------------------------
-- 3 · Abertura atômica do formulário RPNC com pasta virtual privada
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_abrir_rpnc_formulario(
  p_descricao text,
  p_tipo_registro text,
  p_severidade text,
  p_setor_id uuid,
  p_codigo_produto text default null,
  p_lote text default null,
  p_cliente_id uuid default null,
  p_data_ocorrencia date default null,
  p_auditoria_id uuid default null,
  p_linked_entity_type text default null,
  p_linked_entity_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_produto uuid;
  v_numero bigint;
  v_numero_rpnc text;
  v_pasta text;
  v_origem text;
  v_row public.erp_rpnc;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'criar') then
    raise exception 'Sem permissão para abrir RPNC.';
  end if;
  if nullif(btrim(p_descricao), '') is null or length(btrim(p_descricao)) < 10 then
    raise exception 'Descreva a não conformidade com pelo menos 10 caracteres.';
  end if;

  -- Origem obrigatória no modelo do formulário, reutilizando o domínio já
  -- vigente de erp_rpnc.sgq_tipo_registro (nenhum valor novo é inventado).
  if p_tipo_registro is null or p_tipo_registro not in
    ('INTERNO', 'EXTERNO', 'RPNC_CLIENTE', 'AUDITORIA_INTERNA', 'AUDITORIA_EXTERNA') then
    raise exception 'Origem da RPNC inválida.';
  end if;
  v_origem := case p_tipo_registro
    when 'INTERNO' then 'interna'
    when 'EXTERNO' then 'externa'
    when 'RPNC_CLIENTE' then 'cliente'
    when 'AUDITORIA_INTERNA' then 'auditoria interna'
    else 'auditoria externa'
  end;

  if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then
    raise exception 'Gravidade inválida.';
  end if;
  if p_setor_id is null or not exists (
    select 1 from public.erp_setores s
    where s.id = p_setor_id and s.empresa_id = v_empresa and s.ativo = true
  ) then raise exception 'Setor inválido para a empresa.'; end if;

  if nullif(btrim(coalesce(p_codigo_produto, '')), '') is not null then
    select pr.id into v_produto from public.erp_produtos pr
      where pr.empresa_id = v_empresa
        and lower(btrim(pr.codigo)) = lower(btrim(p_codigo_produto))
        and coalesce(pr.ativo, true) = true
      limit 1;
    if v_produto is null then
      raise exception 'Código de peça/produto não cadastrado na empresa: %', btrim(p_codigo_produto);
    end if;
  end if;

  if p_cliente_id is not null and not exists (
    select 1 from public.erp_clientes c where c.id = p_cliente_id and c.empresa_id = v_empresa
  ) then raise exception 'Cliente inválido para a empresa.'; end if;

  if p_auditoria_id is not null and not exists (
    select 1 from public.erp_sgq_auditorias a
    where a.id = p_auditoria_id and a.empresa_id = v_empresa
  ) then raise exception 'Auditoria inválida para a empresa.'; end if;

  select u.id into v_usuario from public.erp_usuarios u
    where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
    limit 1;
  if v_usuario is null then raise exception 'Usuário ERP ativo não identificado.'; end if;

  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
    values (v_empresa, 'RPNC-' || to_char(current_date, 'YYYY'), 1)
    on conflict (empresa_id, chave)
      do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
    returning proximo_valor into v_numero;

  loop
    v_numero_rpnc := 'RPNC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_numero::text, 6, '0');
    exit when not exists (
      select 1 from public.erp_rpnc where empresa_id = v_empresa and numero_rpnc = v_numero_rpnc
    );
    update public.erp_sgq_contadores set proximo_valor = proximo_valor + 1
      where empresa_id = v_empresa and chave = 'RPNC-' || to_char(current_date, 'YYYY')
      returning proximo_valor into v_numero;
  end loop;

  -- Pasta virtual privada: prefixo único por RPNC, dentro do bucket já criado.
  v_pasta := v_empresa::text || '/rpnc_' || v_numero_rpnc;

  perform set_config('app.sgq_rpnc_open', 'open', true);

  insert into public.erp_rpnc (
    empresa_id, numero_rpnc, descricao_nao_conformidade, status, acao_corretiva,
    sgq_origem, sgq_severidade, setor_id, sgq_vinculo_tipo, sgq_vinculo_id, sgq_aberto_por,
    sgq_tipo_registro, sgq_produto_id, sgq_cliente_id, sgq_lote, sgq_data_ocorrencia,
    sgq_responsavel_id, sgq_auditoria_id, sgq_pasta_evidencias, data_ocorrencia
  ) values (
    v_empresa, v_numero_rpnc, btrim(p_descricao), 'aberta', btrim(p_descricao),
    v_origem, p_severidade, p_setor_id, nullif(btrim(coalesce(p_linked_entity_type, '')), ''),
    p_linked_entity_id, v_usuario,
    p_tipo_registro, v_produto, p_cliente_id,
    nullif(btrim(coalesce(p_lote, '')), ''), coalesce(p_data_ocorrencia, current_date),
    v_usuario, p_auditoria_id, v_pasta,
    coalesce(p_data_ocorrencia, current_date)
  )
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'numero_rpnc', v_row.numero_rpnc,
    'status', v_row.status,
    'pasta_evidencias', v_row.sgq_pasta_evidencias,
    'bucket', 'qualidade-evidencias'
  );
end
$$;

-- ---------------------------------------------------------------------------
-- 4 · Gravação do formulário (relato, investigação, equipe, padrão, auditoria)
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_salvar_formulario_rpnc(
  p_rpnc_id uuid,
  p_tratamento jsonb,
  p_ishikawa jsonb,
  p_cinco_porques jsonb,
  p_auditoria_id uuid default null,
  p_codigo_produto text default null,
  p_lote text default null,
  p_data_ocorrencia date default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_produto uuid;
  v_row public.erp_rpnc;
  v_key text;
  v_value jsonb;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'editar') then
    raise exception 'Sem permissão para atualizar o formulário da RPNC.';
  end if;
  if jsonb_typeof(p_tratamento) is distinct from 'object' then
    raise exception 'Os campos do formulário de tratamento devem ser um objeto JSON.';
  end if;
  if jsonb_typeof(p_ishikawa) is distinct from 'object' then
    raise exception 'Ishikawa deve ser um objeto JSON.';
  end if;
  foreach v_key in array array['Metodo', 'Maquina', 'Medida', 'MeioAmbiente', 'MaoDeObra', 'Material'] loop
    v_value := p_ishikawa -> v_key;
    if jsonb_typeof(v_value) is distinct from 'array' then
      raise exception 'Grupo Ishikawa inválido: %.', v_key;
    end if;
    if exists (select 1 from jsonb_array_elements(v_value) as item(value) where jsonb_typeof(item.value) <> 'string') then
      raise exception 'As causas do grupo % devem ser textos.', v_key;
    end if;
  end loop;
  if jsonb_typeof(p_cinco_porques) is distinct from 'array' or jsonb_array_length(p_cinco_porques) <> 5 then
    raise exception 'A cadeia principal deve conter exatamente cinco porquês.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_cinco_porques) as item(value) where jsonb_typeof(item.value) <> 'string') then
    raise exception 'Cada porquê deve ser um texto.';
  end if;

  if nullif(btrim(coalesce(p_codigo_produto, '')), '') is not null then
    select pr.id into v_produto from public.erp_produtos pr
      where pr.empresa_id = v_empresa
        and lower(btrim(pr.codigo)) = lower(btrim(p_codigo_produto))
        and coalesce(pr.ativo, true) = true
      limit 1;
    if v_produto is null then
      raise exception 'Código de peça/produto não cadastrado na empresa: %', btrim(p_codigo_produto);
    end if;
  end if;

  if p_auditoria_id is not null and not exists (
    select 1 from public.erp_sgq_auditorias a
    where a.id = p_auditoria_id and a.empresa_id = v_empresa
  ) then raise exception 'Auditoria inválida para a empresa.'; end if;

  select * into v_row from public.erp_rpnc
    where id = p_rpnc_id and empresa_id = v_empresa and sgq_origem is not null
    for update;
  if not found then raise exception 'RPNC não encontrada nesta empresa.'; end if;

  update public.erp_rpnc set
    sgq_tratamento_anomalia = p_tratamento,
    ishikawa_data = p_ishikawa,
    cinco_porques = p_cinco_porques,
    sgq_auditoria_id = p_auditoria_id,
    sgq_produto_id = coalesce(v_produto, sgq_produto_id),
    sgq_lote = coalesce(nullif(btrim(coalesce(p_lote, '')), ''), sgq_lote),
    sgq_data_ocorrencia = coalesce(p_data_ocorrencia, sgq_data_ocorrencia)
  where id = p_rpnc_id and empresa_id = v_empresa
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'numero_rpnc', v_row.numero_rpnc,
    'status', v_row.status,
    'pasta_evidencias', v_row.sgq_pasta_evidencias,
    'salvo_em', now()
  );
end
$$;

-- ---------------------------------------------------------------------------
-- 5 · Varredura de recorrência por código de peça ou lote (isolada por empresa)
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_buscar_recorrencia_rpnc(
  p_codigo_produto text,
  p_lote text default null,
  p_excluir_rpnc_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_codigo text := lower(btrim(coalesce(p_codigo_produto, '')));
  v_lote text := lower(btrim(coalesce(p_lote, '')));
  v_result jsonb;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'ver') then
    raise exception 'Sem permissão para consultar o histórico de RPNC.';
  end if;
  if v_codigo = '' and v_lote = '' then
    raise exception 'Informe o código da peça ou o lote para a varredura de recorrência.';
  end if;

  select coalesce(jsonb_agg(registro order by registro ->> 'criado_em' desc), '[]'::jsonb)
    into v_result
  from (
    select jsonb_build_object(
      'id', r.id,
      'numero_rpnc', r.numero_rpnc,
      'status', r.status,
      'severidade', r.sgq_severidade,
      'tipo_registro', r.sgq_tipo_registro,
      'descricao', r.descricao_nao_conformidade,
      'criado_em', r.criado_em,
      'data_ocorrencia', coalesce(r.sgq_data_ocorrencia, r.data_ocorrencia::date),
      'lote', coalesce(nullif(r.sgq_lote, ''), nullif(r.lote_afetado, '')),
      'produto_codigo', pr.codigo,
      'produto_nome', pr.nome,
      'setor', s.nome,
      'ishikawa_data', r.ishikawa_data,
      'cinco_porques', r.cinco_porques,
      'contencao', r.sgq_contencao,
      'acao_preventiva', r.sgq_acao_preventiva,
      'verificacao_eficacia', r.sgq_verificacao_eficacia,
      'eficacia_aprovada', r.eficacia_aprovada,
      'acoes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id,
          'tipo', a.tipo,
          'descricao', a.descricao,
          'causa_raiz', a.causa_raiz,
          'responsavel', u.nome,
          'prazo', a.prazo,
          'status', a.status,
          'resultado_eficacia', a.resultado_eficacia,
          'evidencia', a.evidencia
        ) order by a.prazo)
        from public.erp_sgq_capa_acoes a
        left join public.erp_usuarios u on u.id = a.responsavel_id
        where a.rpnc_id = r.id and a.empresa_id = r.empresa_id
      ), '[]'::jsonb),
      'evidencias', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', e.id,
          'nome_arquivo', e.nome_arquivo,
          'storage_path', e.storage_path,
          'finalidade', e.finalidade
        ) order by e.created_at)
        from public.erp_qualidade_rpnc_evidencias e
        where e.rpnc_id = r.id and e.empresa_id = r.empresa_id
      ), '[]'::jsonb)
    ) as registro
    from public.erp_rpnc r
    left join public.erp_produtos pr on pr.id = r.sgq_produto_id
    left join public.erp_setores s on s.id = r.setor_id
    where r.empresa_id = v_empresa
      and r.sgq_origem is not null
      and (p_excluir_rpnc_id is null or r.id <> p_excluir_rpnc_id)
      and (
        (v_codigo <> '' and lower(btrim(coalesce(pr.codigo, ''))) = v_codigo)
        or (v_lote <> '' and (
              lower(btrim(coalesce(r.sgq_lote, ''))) = v_lote
              or lower(btrim(coalesce(r.lote_afetado, ''))) = v_lote
            ))
      )
    order by r.criado_em desc
    limit 20
  ) encontrado;

  return coalesce(v_result, '[]'::jsonb);
end
$$;

-- ---------------------------------------------------------------------------
-- 6 · Plano de ação CAPA dinâmico (inserção/atualização em uma única chamada)
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_salvar_acoes_rpnc(p_rpnc_id uuid, p_acoes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_item jsonb;
  v_acao public.erp_sgq_capa_acoes;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_guardado int;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if jsonb_typeof(p_acoes) is distinct from 'array' then
    raise exception 'O plano de ação deve ser uma lista de ações.';
  end if;
  if not exists (
    select 1 from public.erp_rpnc r
    where r.id = p_rpnc_id and r.empresa_id = v_empresa and r.sgq_origem is not null
  ) then raise exception 'RPNC não encontrada nesta empresa.'; end if;

  select u.id into v_usuario from public.erp_usuarios u
    where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
    limit 1;
  if v_usuario is null then raise exception 'Usuário ERP ativo não identificado.'; end if;

  for v_item in select jsonb_array_elements(p_acoes) loop
    if jsonb_typeof(v_item) is distinct from 'object' then raise exception 'Cada ação deve ser um objeto JSON.'; end if;
    if nullif(btrim(coalesce(v_item ->> 'descricao', '')), '') is null then
      raise exception 'Toda ação CAPA exige a descrição do quê será feito.';
    end if;
    if coalesce(v_item ->> 'tipo', '') not in ('Contencao', 'Corretiva', 'Preventiva') then
      raise exception 'Tipo de ação inválido: %.', coalesce(v_item ->> 'tipo', 'vazio');
    end if;
    if nullif(v_item ->> 'prazo', '') is null then raise exception 'Toda ação CAPA exige prazo.'; end if;
    if nullif(v_item ->> 'responsavel_id', '') is null then raise exception 'Toda ação CAPA exige responsável.'; end if;
    if not exists (
      select 1 from public.erp_usuarios u
      where u.id = (v_item ->> 'responsavel_id')::uuid
        and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
    ) then raise exception 'Responsável da ação não pertence à empresa ou está inativo.'; end if;

    v_id := nullif(v_item ->> 'id', '')::uuid;
    if v_id is null then
      if not public.erp_has_permission('qualidade', 'criar') then
        raise exception 'Sem permissão para criar ações CAPA.';
      end if;
      insert into public.erp_sgq_capa_acoes (
        empresa_id, rpnc_id, tipo, descricao, causa_raiz, responsavel_id, prazo, status
      ) values (
        v_empresa, p_rpnc_id, v_item ->> 'tipo', btrim(v_item ->> 'descricao'),
        nullif(btrim(coalesce(v_item ->> 'causa_raiz', '')), ''),
        (v_item ->> 'responsavel_id')::uuid, (v_item ->> 'prazo')::date,
        coalesce(nullif(v_item ->> 'status', ''), 'Planejada')
      )
      returning * into v_acao;
      v_ids := v_ids || v_acao.id;
    else
      if not public.erp_has_permission('qualidade', 'editar') then
        raise exception 'Sem permissão para atualizar ações CAPA.';
      end if;
      update public.erp_sgq_capa_acoes set
        tipo = v_item ->> 'tipo',
        descricao = btrim(v_item ->> 'descricao'),
        causa_raiz = nullif(btrim(coalesce(v_item ->> 'causa_raiz', '')), ''),
        responsavel_id = (v_item ->> 'responsavel_id')::uuid,
        prazo = (v_item ->> 'prazo')::date
      where id = v_id and rpnc_id = p_rpnc_id and empresa_id = v_empresa
      returning * into v_acao;
      if not found then raise exception 'Ação CAPA não encontrada nesta RPNC.'; end if;
      v_ids := v_ids || v_acao.id;
    end if;
  end loop;

  -- Remove apenas ações ainda no estado 'Planejada' e criadas pelo próprio usuário;
  -- o workflow aprovado (aprovação/verificação) nunca é apagado por esta função.
  delete from public.erp_sgq_capa_acoes a
  where a.rpnc_id = p_rpnc_id
    and a.empresa_id = v_empresa
    and a.status = 'Planejada'
    and a.created_by = v_usuario
    and not (a.id = any (v_ids));
  get diagnostics v_guardado = row_count;

  return jsonb_build_object(
    'rpnc_id', p_rpnc_id,
    'acoes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'tipo', a.tipo,
        'descricao', a.descricao,
        'causa_raiz', a.causa_raiz,
        'responsavel_id', a.responsavel_id,
        'responsavel', u.nome,
        'prazo', a.prazo,
        'status', a.status,
        'resultado_eficacia', a.resultado_eficacia,
        'created_by', a.created_by
      ) order by a.prazo, a.created_at)
      from public.erp_sgq_capa_acoes a
      left join public.erp_usuarios u on u.id = a.responsavel_id
      where a.rpnc_id = p_rpnc_id and a.empresa_id = v_empresa
    ), '[]'::jsonb),
    'removidas', v_guardado
  );
end
$$;

-- ---------------------------------------------------------------------------
-- 7 · Vínculo/desvínculo de RPNC com auditoria a partir do painel de auditorias
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_vincular_rpnc_auditoria(p_rpnc_id uuid, p_auditoria_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_rpnc public.erp_rpnc;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if not public.erp_has_permission('qualidade', 'editar') then
    raise exception 'Sem permissão para vincular RPNC a auditoria.';
  end if;
  if p_auditoria_id is not null and not exists (
    select 1 from public.erp_sgq_auditorias a
    where a.id = p_auditoria_id and a.empresa_id = v_empresa
  ) then raise exception 'Auditoria inválida para a empresa.'; end if;

  select * into v_rpnc from public.erp_rpnc
    where id = p_rpnc_id and empresa_id = v_empresa and sgq_origem is not null;
  if not found then raise exception 'RPNC não encontrada nesta empresa.'; end if;

  update public.erp_rpnc
    set sgq_auditoria_id = p_auditoria_id
  where id = p_rpnc_id and empresa_id = v_empresa
  returning * into v_rpnc;

  return jsonb_build_object(
    'rpnc_id', v_rpnc.id,
    'numero_rpnc', v_rpnc.numero_rpnc,
    'auditoria_id', v_rpnc.sgq_auditoria_id
  );
end
$$;

revoke all on function public.erp_sgq_abrir_rpnc_formulario(text, text, text, uuid, text, text, uuid, date, uuid, text, uuid) from public;
revoke all on function public.erp_sgq_salvar_formulario_rpnc(uuid, jsonb, jsonb, jsonb, uuid, text, text, date) from public;
revoke all on function public.erp_sgq_buscar_recorrencia_rpnc(text, text, uuid) from public;
revoke all on function public.erp_sgq_salvar_acoes_rpnc(uuid, jsonb) from public;
revoke all on function public.erp_sgq_vincular_rpnc_auditoria(uuid, uuid) from public;

grant execute on function public.erp_sgq_abrir_rpnc_formulario(text, text, text, uuid, text, text, uuid, date, uuid, text, uuid) to authenticated;
grant execute on function public.erp_sgq_salvar_formulario_rpnc(uuid, jsonb, jsonb, jsonb, uuid, text, text, date) to authenticated;
grant execute on function public.erp_sgq_buscar_recorrencia_rpnc(text, text, uuid) to authenticated;
grant execute on function public.erp_sgq_salvar_acoes_rpnc(uuid, jsonb) to authenticated;
grant execute on function public.erp_sgq_vincular_rpnc_auditoria(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8 · Políticas ADITIVAS de storage para a pasta rpnc_{numero_rpnc}
--    As políticas por uuid do registro permanecem ativas para a tela aprovada.
-- ---------------------------------------------------------------------------
drop policy if exists qualidade_evidencias_select_protocolo on storage.objects;
create policy qualidade_evidencias_select_protocolo on storage.objects
  for select to authenticated using (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.empresa_id = public.erp_current_empresa_id()
        and ('rpnc_' || r.numero_rpnc) = (storage.foldername(name))[2]
        and public.erp_has_permission('qualidade', 'ver')
    )
  );

drop policy if exists qualidade_evidencias_insert_protocolo on storage.objects;
create policy qualidade_evidencias_insert_protocolo on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.empresa_id = public.erp_current_empresa_id()
        and ('rpnc_' || r.numero_rpnc) = (storage.foldername(name))[2]
        and public.erp_has_permission('qualidade', 'editar')
    )
  );

drop policy if exists qualidade_evidencias_delete_protocolo on storage.objects;
create policy qualidade_evidencias_delete_protocolo on storage.objects
  for delete to authenticated using (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.empresa_id = public.erp_current_empresa_id()
        and ('rpnc_' || r.numero_rpnc) = (storage.foldername(name))[2]
        and public.erp_has_permission('qualidade', 'editar')
    )
  );

commit;
