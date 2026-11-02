/**
 * @AUTOR: Fernando Schuinsekel
 * @DATA_REVISAO_APROVACAO: 2026-11-01
 * @REVISAO: REV-SGQ-GED-OITO-ABAS-20261101-01 — Controle de Documentos da Qualidade: colunas que as functions já gravavam e ninguém criava, anexos versionados, distribuição com ciência, trilha de auditoria e as RPCs das 8 abas
 * @STATUS_APROVACAO: AGUARDA APLICAÇÃO DESTE ARQUIVO SQL PELO PROPRIETÁRIO (só a anon key existe no frontend)
 */

-- ---------------------------------------------------------------------------
-- Fatos verificados antes de escrever este arquivo
--   * As duas tabelas do GED são criadas por 20260927240000:1-2 e já têm RLS por
--     empresa (20260927240000:5-10). A tela de 8 abas mexe só nelas e no que este
--     arquivo cria.
--   * DERIVA DE SCHEMA: erp_salvar_revisao_documento escreve setor_responsavel,
--     status e motivo_alteracao em erp_qualidade_documentos_editor e
--     motivo_alteracao em _revisoes (20261010172051:98-129), mas NENHUM arquivo
--     deste repo cria essas colunas — 20261010120000:3-5 adiciona apenas
--     data_vigencia e criado_por. Num banco montado só por estas migrations,
--     salvar uma revisão falha por coluna inexistente. Item 1 corrige.
--   * Defeito real no mesmo caminho: data_homologacao nasceu NOT NULL
--     (20260927240000:1) e a mesma function grava data_homologacao = null para o
--     estado EM_REVISAO (20261010172051:118), o que violaria a constraint. O
--     item 1 libera o NOT NULL, que é o estado que o fluxo já assume.
--   * erp_qualidade_revisao_anexo_vincular exige o bucket erp-qualidade-anexos
--     (20261011150000:23) e há política de delete recortada por empresa
--     (20261010172051:13-20), mas nenhum arquivo cria o bucket nem as políticas
--     de leitura/inserção. Item 5.
--   * As políticas do bucket erp-documentos-qualidade (20260927240000:13-14) não
--     filtram empresa: qualquer usuário autenticado de qualquer tenant lê o
--     bucket inteiro. Item 5 conserta para pasta da empresa.
--   * Não existe versão de anexo, distribuição com ciência nem trilha de
--     auditoria do documento: as abas 3, 5, 6 e 8 precisariam de dados que o
--     banco não tem. Itens 2, 3 e 4 criam.
--   * A família erp_documentos_qualidade (20260912160000) fica FORA deste arquivo
--     de propósito: a tabela base não tem CREATE em nenhuma migration do repo e
--     a tela não vai escrever em estrutura que não consegue provar.
--   * Os status da revisão continuam os quatro de 20261010120000:21-23 e ganha-se
--     REPROVADO, que a aba de aprovação precisa para devolver um documento.
--     Nenhuma function existente escreve valor fora dessa lista de cinco.
--   * erp_current_empresa_id(), erp_has_permission(modulo, acao) e as colunas
--     erp_usuarios(auth_user_id, ativo, deleted_at, nivel_admin, is_master,
--     perfil, nome, email) são as mesmas já usadas por 20260917120000:41-90 e
--     20261011150000:26-33.
-- ---------------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------------
-- 1 · Colunas que faltam nas tabelas que as functions já gravam
-- ---------------------------------------------------------------------------
alter table public.erp_qualidade_documentos_editor
  add column if not exists status text,
  add column if not exists setor_responsavel text,
  add column if not exists motivo_alteracao text,
  add column if not exists tipo_documento text,
  add column if not exists elaborador text,
  add column if not exists revisor text,
  add column if not exists aprovador text,
  add column if not exists proxima_revisao date,
  add column if not exists validade_ate date,
  add column if not exists observacao text,
  add column if not exists criado_por uuid;

alter table public.erp_qualidade_documentos_editor
  alter column data_homologacao drop not null;

alter table public.erp_qualidade_documentos_revisoes
  add column if not exists motivo_alteracao text,
  add column if not exists aprovado_por uuid,
  add column if not exists aprovado_por_nome text,
  add column if not exists aprovado_em timestamptz,
  add column if not exists comentario_aprovacao text,
  add column if not exists devolvido_motivo text,
  add column if not exists observacao text,
  add column if not exists atualizado_em timestamptz not null default now();

-- Mesmo laço de 20261010120000:7-19: remove a checagem antiga e repõe com REPROVADO.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.erp_qualidade_documentos_revisoes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.erp_qualidade_documentos_revisoes drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.erp_qualidade_documentos_revisoes
  add constraint erp_qualidade_documentos_revisoes_status_check
  check (status in ('EM_REVISAO','REPROVADO','VIGENTE','ATIVA','OBSOLETO'));

create index if not exists erp_sgq_editor_empresa_status_idx
  on public.erp_qualidade_documentos_editor (empresa_id, status, codigo_documento);

create index if not exists erp_sgq_revisoes_empresa_codigo_status_idx
  on public.erp_qualidade_documentos_revisoes (empresa_id, codigo_documento, status);

-- ---------------------------------------------------------------------------
-- 2 · Anexos com versão (abas 5 e 6)
--    Cada arquivo tem sua própria cadeia: o nome lógico é o nome sem extensão,
--    e só existe uma versão vigente por cadeia. Substituir nunca apaga a anterior.
-- ---------------------------------------------------------------------------
create table if not exists public.erp_sgq_documento_anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  documento_id uuid not null references public.erp_qualidade_documentos_editor(id) on delete cascade,
  codigo_documento text not null,
  revisao_id uuid references public.erp_qualidade_documentos_revisoes(id) on delete set null,
  revisao_numero integer,
  nome_arquivo text not null,
  nome_logico text not null,
  storage_path text not null,
  mime_type text,
  tamanho_bytes bigint not null check (tamanho_bytes > 0 and tamanho_bytes <= 52428800),
  versao integer not null check (versao > 0),
  status text not null default 'vigente' check (status in ('vigente','obsoleto')),
  motivo text,
  motivo_obsolescencia text,
  substituido_por uuid references public.erp_sgq_documento_anexos(id) on delete set null,
  criado_por uuid,
  criado_por_nome text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (documento_id, nome_logico, versao),
  unique (storage_path)
);

create unique index if not exists erp_sgq_documento_anexos_vigente_ux
  on public.erp_sgq_documento_anexos (documento_id, nome_logico)
  where status = 'vigente';

create index if not exists erp_sgq_documento_anexos_empresa_idx
  on public.erp_sgq_documento_anexos (empresa_id, codigo_documento, versao desc);

alter table public.erp_sgq_documento_anexos enable row level security;

drop policy if exists erp_sgq_documento_anexos_select on public.erp_sgq_documento_anexos;
create policy erp_sgq_documento_anexos_select on public.erp_sgq_documento_anexos
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));

-- ---------------------------------------------------------------------------
-- 3 · Distribuição controlada e ciência do setor (aba 3)
-- ---------------------------------------------------------------------------
create table if not exists public.erp_sgq_documento_distribuicoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  documento_id uuid not null references public.erp_qualidade_documentos_editor(id) on delete cascade,
  codigo_documento text not null,
  revisao_id uuid not null references public.erp_qualidade_documentos_revisoes(id) on delete cascade,
  revisao_numero integer,
  setor text not null,
  motivo text,
  distribuido_por uuid,
  distribuido_por_nome text,
  distribuido_em timestamptz not null default now(),
  ciencia_em timestamptz,
  ciencia_por uuid,
  ciencia_por_nome text,
  unique (revisao_id, setor)
);

create index if not exists erp_sgq_documento_distribuicoes_empresa_idx
  on public.erp_sgq_documento_distribuicoes (empresa_id, codigo_documento, distribuido_em desc);

alter table public.erp_sgq_documento_distribuicoes enable row level security;

drop policy if exists erp_sgq_documento_distribuicoes_select on public.erp_sgq_documento_distribuicoes;
create policy erp_sgq_documento_distribuicoes_select on public.erp_sgq_documento_distribuicoes
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));

-- ---------------------------------------------------------------------------
-- 4 · Trilha de auditoria do documento (aba 8)
--    Somente as functions deste arquivo inserem; ninguém edita nem apaga.
-- ---------------------------------------------------------------------------
create table if not exists public.erp_sgq_documento_trilha (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  documento_id uuid,
  codigo_documento text,
  revisao_numero integer,
  evento text not null check (evento in ('cadastro','salvo','nova_revisao','anexo_vinculado','anexo_substituido','aprovado','devolvido','obsoleto','distribuido','ciencia')),
  ator_nome text,
  detalhe jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists erp_sgq_documento_trilha_empresa_idx
  on public.erp_sgq_documento_trilha (empresa_id, criado_em desc);

alter table public.erp_sgq_documento_trilha enable row level security;

drop policy if exists erp_sgq_documento_trilha_select on public.erp_sgq_documento_trilha;
create policy erp_sgq_documento_trilha_select on public.erp_sgq_documento_trilha
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));

-- ---------------------------------------------------------------------------
-- 5 · Storage: bucket dos anexos criado e políticas recortadas por empresa
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('erp-qualidade-anexos', 'erp-qualidade-anexos', false, 52428800,
  array['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroenabled.12',
        'image/png','image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists erp_qms_anexos_storage_select on storage.objects;
create policy erp_qms_anexos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'erp-qualidade-anexos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_qms_anexos_storage_insert on storage.objects;
create policy erp_qms_anexos_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'erp-qualidade-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and public.erp_has_permission('qualidade', 'editar')
  );

drop policy if exists erp_qms_anexos_storage_update on storage.objects;
create policy erp_qms_anexos_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'erp-qualidade-anexos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text)
  with check (bucket_id = 'erp-qualidade-anexos' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

-- A política de delete já existia (20261010172051:13-20); repõe com o mesmo nome e
-- acrescenta a permissão, porque excluir arquivo de documento controlado não é leitura.
drop policy if exists erp_qms_anexos_storage_delete on storage.objects;
create policy erp_qms_anexos_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'erp-qualidade-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and public.erp_has_permission('qualidade', 'editar')
  );

-- Conserto do bucket criado em 20260927240000: as políticas antigas não separavam
-- os tenants. Mantêm o mesmo nome para que a substituição seja rastreável.
drop policy if exists qualidade_storage_select on storage.objects;
create policy qualidade_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'erp-documentos-qualidade' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists qualidade_storage_insert on storage.objects;
create policy qualidade_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'erp-documentos-qualidade' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

-- ---------------------------------------------------------------------------
-- 6 · Quem pode gravar documento controlado
--    Mesma régua já usada por 20261011150000:29-33, mais a permissão RBAC.
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_documento_pode_gravar()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.erp_usuarios u
    where (u.auth_user_id = auth.uid() or u.id = auth.uid())
      and u.empresa_id = public.erp_current_empresa_id()
      and u.ativo = true
      and u.deleted_at is null
      and (
        coalesce(u.is_master, false)
        or coalesce(u.nivel_admin, 0) >= 1
        or upper(coalesce(u.perfil, '')) like '%QUALIDADE%'
        or upper(coalesce(u.perfil, '')) like '%ADMIN%'
        or public.erp_has_permission('qualidade', 'editar')
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- 7 · Cadastro e revisão (abas 1 e 2)
--    Documento novo nasce como rascunho EM_REVISAO. Editar um documento já
--    aprovado abre a revisão seguinte; editar enquanto há rascunho ajusta o
--    rascunho. O código do documento é a identidade e não muda.
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_documento_salvar(
  p_documento_id uuid,
  p_codigo text,
  p_titulo text,
  p_tipo text,
  p_departamento text,
  p_elaborador text,
  p_revisor text,
  p_aprovador text,
  p_proxima_revisao date,
  p_validade_ate date,
  p_conteudo text,
  p_motivo text,
  p_observacao text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_nome text;
  v_codigo text := upper(btrim(coalesce(p_codigo, '')));
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_departamento text := nullif(btrim(coalesce(p_departamento, '')), '');
  v_editor public.erp_qualidade_documentos_editor%rowtype;
  v_rascunho public.erp_qualidade_documentos_revisoes%rowtype;
  v_documento_id uuid := p_documento_id;
  v_revisao_id uuid;
  v_revisao integer;
  v_evento text;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;

  select u.id, coalesce(nullif(btrim(u.nome), ''), u.email, 'Usuário do ERP')
    into v_usuario_id, v_usuario_nome
  from public.erp_usuarios u
  where (u.auth_user_id = auth.uid() or u.id = auth.uid())
    and u.empresa_id = v_empresa
    and u.ativo = true
    and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa da sessão' using errcode = '42501';
  end if;
  if not public.erp_sgq_documento_pode_gravar() then
    raise exception 'Somente responsável da Qualidade ou administrador grava documento controlado' using errcode = '42501';
  end if;

  if v_codigo = '' or v_titulo = '' then
    raise exception 'Código e título do documento são obrigatórios' using errcode = '22023';
  end if;
  if length(v_codigo) > 50 then
    raise exception 'O código do documento tem no máximo 50 caracteres' using errcode = '22023';
  end if;
  if length(v_titulo) > 255 then
    raise exception 'O título do documento tem no máximo 255 caracteres' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text || ':' || v_codigo));

  if v_documento_id is null then
    if btrim(coalesce(p_conteudo, '')) = '' then
      raise exception 'Ao cadastrar, descreva o conteúdo do documento; o arquivo é anexado em seguida' using errcode = '22023';
    end if;
    if exists (select 1 from public.erp_qualidade_documentos_editor where empresa_id = v_empresa and codigo_documento = v_codigo) then
      raise exception 'Já existe documento com o código % nesta empresa', v_codigo using errcode = '23505';
    end if;

    insert into public.erp_qualidade_documentos_editor (
      empresa_id, codigo_documento, titulo_documento, revisao, data_homologacao, conteudo_texto,
      status, setor_responsavel, tipo_documento, elaborador, revisor, aprovador,
      proxima_revisao, validade_ate, observacao, motivo_alteracao, criado_por, atualizado_em
    ) values (
      v_empresa, v_codigo, v_titulo, 1, null, btrim(p_conteudo),
      'EM_REVISAO', v_departamento, nullif(btrim(coalesce(p_tipo, '')), ''),
      nullif(btrim(coalesce(p_elaborador, '')), ''), nullif(btrim(coalesce(p_revisor, '')), ''),
      nullif(btrim(coalesce(p_aprovador, '')), ''), p_proxima_revisao, p_validade_ate,
      nullif(btrim(coalesce(p_observacao, '')), ''), nullif(btrim(coalesce(p_motivo, '')), ''),
      v_usuario_id, now()
    ) returning id into v_documento_id;

    insert into public.erp_qualidade_documentos_revisoes (
      empresa_id, codigo_documento, titulo_documento, departamento, revisao, responsavel,
      status, conteudo_texto, motivo_alteracao, criado_por, observacao, atualizado_em
    ) values (
      v_empresa, v_codigo, v_titulo, coalesce(v_departamento, 'QUALIDADE'), 1, v_usuario_nome,
      'EM_REVISAO', btrim(p_conteudo), nullif(btrim(coalesce(p_motivo, '')), ''),
      v_usuario_id, nullif(btrim(coalesce(p_observacao, '')), ''), now()
    ) returning id into v_revisao_id;

    v_revisao := 1;
    v_evento := 'cadastro';
  else
    select * into v_editor
    from public.erp_qualidade_documentos_editor
    where id = v_documento_id and empresa_id = v_empresa
    for update;

    if v_editor.id is null then
      raise exception 'Documento não encontrado nesta empresa' using errcode = 'P0002';
    end if;
    if v_codigo <> v_editor.codigo_documento then
      raise exception 'O código % é a identidade do documento e não muda; cadastre um novo documento', v_editor.codigo_documento using errcode = '22023';
    end if;

    select * into v_rascunho
    from public.erp_qualidade_documentos_revisoes
    where empresa_id = v_empresa
      and codigo_documento = v_editor.codigo_documento
      and status in ('EM_REVISAO', 'REPROVADO')
    order by revisao desc
    limit 1
    for update;

    if v_rascunho.id is null then
      v_revisao := v_editor.revisao + 1;
      -- A revisão nova nasce sem arquivo: url_anexo da revisão vigente anterior não
      -- vale como comprovação da nova, e a aprovação exige o arquivo desta revisão.
      insert into public.erp_qualidade_documentos_revisoes (
        empresa_id, codigo_documento, titulo_documento, departamento, revisao, responsavel,
        status, conteudo_texto, motivo_alteracao, criado_por, observacao, atualizado_em
      ) values (
        v_empresa, v_editor.codigo_documento, v_titulo,
        coalesce(v_departamento, v_editor.setor_responsavel, 'QUALIDADE'),
        v_revisao, v_usuario_nome, 'EM_REVISAO',
        coalesce(nullif(btrim(coalesce(p_conteudo, '')), ''), v_editor.conteudo_texto),
        nullif(btrim(coalesce(p_motivo, '')), ''), v_usuario_id,
        nullif(btrim(coalesce(p_observacao, '')), ''), now()
      ) returning id into v_revisao_id;
      v_evento := 'nova_revisao';
    else
      v_revisao := v_rascunho.revisao;
      update public.erp_qualidade_documentos_revisoes
      set titulo_documento = v_titulo,
          departamento = coalesce(v_departamento, departamento),
          conteudo_texto = coalesce(nullif(btrim(coalesce(p_conteudo, '')), ''), conteudo_texto),
          motivo_alteracao = coalesce(nullif(btrim(coalesce(p_motivo, '')), ''), motivo_alteracao),
          observacao = coalesce(nullif(btrim(coalesce(p_observacao, '')), ''), observacao),
          status = 'EM_REVISAO',
          devolvido_motivo = null,
          atualizado_em = now()
      where id = v_rascunho.id;
      v_revisao_id := v_rascunho.id;
      v_evento := 'salvo';
    end if;

    update public.erp_qualidade_documentos_editor
    set titulo_documento = v_titulo,
        revisao = v_revisao,
        conteudo_texto = coalesce(nullif(btrim(coalesce(p_conteudo, '')), ''), conteudo_texto),
        status = 'EM_REVISAO',
        data_homologacao = null,
        setor_responsavel = coalesce(v_departamento, setor_responsavel),
        tipo_documento = coalesce(nullif(btrim(coalesce(p_tipo, '')), ''), tipo_documento),
        elaborador = coalesce(nullif(btrim(coalesce(p_elaborador, '')), ''), elaborador),
        revisor = coalesce(nullif(btrim(coalesce(p_revisor, '')), ''), revisor),
        aprovador = coalesce(nullif(btrim(coalesce(p_aprovador, '')), ''), aprovador),
        proxima_revisao = coalesce(p_proxima_revisao, proxima_revisao),
        validade_ate = coalesce(p_validade_ate, validade_ate),
        observacao = coalesce(nullif(btrim(coalesce(p_observacao, '')), ''), observacao),
        motivo_alteracao = coalesce(nullif(btrim(coalesce(p_motivo, '')), ''), motivo_alteracao),
        atualizado_em = now()
    where id = v_documento_id and empresa_id = v_empresa;
  end if;

  insert into public.erp_sgq_documento_trilha (
    empresa_id, documento_id, codigo_documento, revisao_numero, evento, ator_nome, detalhe
  ) values (
    v_empresa, v_documento_id, v_codigo, v_revisao, v_evento, v_usuario_nome,
    jsonb_build_object('titulo', v_titulo, 'motivo', nullif(btrim(coalesce(p_motivo, '')), ''))
  );

  return jsonb_build_object(
    'documento_id', v_documento_id,
    'revisao_id', v_revisao_id,
    'codigo_documento', v_codigo,
    'revisao', v_revisao,
    'status', 'EM_REVISAO',
    'evento', v_evento,
    'responsavel', v_usuario_nome
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- 8 · Aprovação (aba 3)
--    Só aprova a revisão mais recente em análise e exige o arquivo original,
--    a mesma régua já aprovada em 20261011153000.
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_documento_aprovar(p_documento_id uuid, p_comentario text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_nome text;
  v_editor public.erp_qualidade_documentos_editor%rowtype;
  v_rascunho public.erp_qualidade_documentos_revisoes%rowtype;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;

  select u.id, coalesce(nullif(btrim(u.nome), ''), u.email, 'Usuário do ERP')
    into v_usuario_id, v_usuario_nome
  from public.erp_usuarios u
  where (u.auth_user_id = auth.uid() or u.id = auth.uid())
    and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa da sessão' using errcode = '42501';
  end if;
  if not public.erp_sgq_documento_pode_gravar() then
    raise exception 'Somente responsável da Qualidade ou administrador aprova documento controlado' using errcode = '42501';
  end if;

  select * into v_editor
  from public.erp_qualidade_documentos_editor
  where id = p_documento_id and empresa_id = v_empresa
  for update;

  if v_editor.id is null then
    raise exception 'Documento não encontrado nesta empresa' using errcode = 'P0002';
  end if;

  select * into v_rascunho
  from public.erp_qualidade_documentos_revisoes
  where empresa_id = v_empresa
    and codigo_documento = v_editor.codigo_documento
    and status = 'EM_REVISAO'
  order by revisao desc
  limit 1
  for update;

  if v_rascunho.id is null then
    raise exception 'Não há revisão em análise para aprovar no documento %', v_editor.codigo_documento using errcode = '22023';
  end if;

  if coalesce(nullif(btrim(v_rascunho.url_anexo), ''), '') = ''
     and not exists (select 1 from public.erp_sgq_documento_anexos a where a.revisao_id = v_rascunho.id and a.status = 'vigente') then
    raise exception 'A revisão % precisa do arquivo original anexado antes da aprovação', v_rascunho.revisao using errcode = '22023';
  end if;

  update public.erp_qualidade_documentos_revisoes
  set status = 'VIGENTE',
      data_vigencia = current_date,
      aprovado_por = v_usuario_id,
      aprovado_por_nome = v_usuario_nome,
      aprovado_em = now(),
      comentario_aprovacao = nullif(btrim(coalesce(p_comentario, '')), ''),
      devolvido_motivo = null,
      atualizado_em = now()
  where id = v_rascunho.id and empresa_id = v_empresa;

  update public.erp_qualidade_documentos_revisoes
  set status = 'OBSOLETO', atualizado_em = now()
  where empresa_id = v_empresa
    and codigo_documento = v_editor.codigo_documento
    and id <> v_rascunho.id
    and status in ('VIGENTE', 'ATIVA');

  update public.erp_qualidade_documentos_editor
  set status = 'VIGENTE',
      revisao = v_rascunho.revisao,
      data_homologacao = current_date,
      aprovador = coalesce(nullif(btrim(aprovador), ''), v_usuario_nome),
      atualizado_em = now()
  where id = v_editor.id and empresa_id = v_empresa;

  insert into public.erp_sgq_documento_trilha (
    empresa_id, documento_id, codigo_documento, revisao_numero, evento, ator_nome, detalhe
  ) values (
    v_empresa, v_editor.id, v_editor.codigo_documento, v_rascunho.revisao, 'aprovado', v_usuario_nome,
    jsonb_build_object('comentario', nullif(btrim(coalesce(p_comentario, '')), ''), 'arquivo', v_rascunho.nome_arquivo)
  );

  return jsonb_build_object(
    'documento_id', v_editor.id,
    'codigo_documento', v_editor.codigo_documento,
    'revisao', v_rascunho.revisao,
    'status', 'VIGENTE',
    'data_vigencia', current_date,
    'aprovado_por', v_usuario_nome
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- 9 · Devolver a revisão para correção (aba 3)
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_documento_devolver(p_documento_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_nome text;
  v_editor public.erp_qualidade_documentos_editor%rowtype;
  v_rascunho public.erp_qualidade_documentos_revisoes%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_status_editor text;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;
  if v_motivo = '' then
    raise exception 'A devolução exige o motivo escrito' using errcode = '22023';
  end if;

  select u.id, coalesce(nullif(btrim(u.nome), ''), u.email, 'Usuário do ERP')
    into v_usuario_id, v_usuario_nome
  from public.erp_usuarios u
  where (u.auth_user_id = auth.uid() or u.id = auth.uid())
    and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa da sessão' using errcode = '42501';
  end if;
  if not public.erp_sgq_documento_pode_gravar() then
    raise exception 'Somente responsável da Qualidade ou administrador devolve documento' using errcode = '42501';
  end if;

  select * into v_editor
  from public.erp_qualidade_documentos_editor
  where id = p_documento_id and empresa_id = v_empresa
  for update;

  if v_editor.id is null then
    raise exception 'Documento não encontrado nesta empresa' using errcode = 'P0002';
  end if;

  select * into v_rascunho
  from public.erp_qualidade_documentos_revisoes
  where empresa_id = v_empresa
    and codigo_documento = v_editor.codigo_documento
    and status = 'EM_REVISAO'
  order by revisao desc
  limit 1
  for update;

  if v_rascunho.id is null then
    raise exception 'Não há revisão em análise para devolver no documento %', v_editor.codigo_documento using errcode = '22023';
  end if;

  update public.erp_qualidade_documentos_revisoes
  set status = 'REPROVADO', devolvido_motivo = v_motivo, atualizado_em = now()
  where id = v_rascunho.id and empresa_id = v_empresa;

  select case when exists (
    select 1 from public.erp_qualidade_documentos_revisoes r
    where r.empresa_id = v_empresa
      and r.codigo_documento = v_editor.codigo_documento
      and r.status in ('VIGENTE', 'ATIVA')
  ) then 'VIGENTE' else 'EM_REVISAO' end
  into v_status_editor;

  update public.erp_qualidade_documentos_editor
  set status = v_status_editor, atualizado_em = now()
  where id = v_editor.id and empresa_id = v_empresa;

  insert into public.erp_sgq_documento_trilha (
    empresa_id, documento_id, codigo_documento, revisao_numero, evento, ator_nome, detalhe
  ) values (
    v_empresa, v_editor.id, v_editor.codigo_documento, v_rascunho.revisao, 'devolvido', v_usuario_nome,
    jsonb_build_object('motivo', v_motivo)
  );

  return jsonb_build_object(
    'documento_id', v_editor.id,
    'codigo_documento', v_editor.codigo_documento,
    'revisao', v_rascunho.revisao,
    'status_revisao', 'REPROVADO',
    'status_documento', v_status_editor
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- 10 · Obsoletar (aba 4)
--      Nada é apagado: o documento e as versões passam a OBSOLETO e continuam
--      legíveis, como o SGQ exige para registro histórico.
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_documento_obsoletar(p_documento_id uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_nome text;
  v_editor public.erp_qualidade_documentos_editor%rowtype;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;
  if v_motivo = '' then
    raise exception 'Tornar um documento obsoleto exige o motivo' using errcode = '22023';
  end if;

  select u.id, coalesce(nullif(btrim(u.nome), ''), u.email, 'Usuário do ERP')
    into v_usuario_id, v_usuario_nome
  from public.erp_usuarios u
  where (u.auth_user_id = auth.uid() or u.id = auth.uid())
    and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa da sessão' using errcode = '42501';
  end if;
  if not public.erp_sgq_documento_pode_gravar() then
    raise exception 'Somente responsável da Qualidade ou administrador torna documento obsoleto' using errcode = '42501';
  end if;

  select * into v_editor
  from public.erp_qualidade_documentos_editor
  where id = p_documento_id and empresa_id = v_empresa
  for update;

  if v_editor.id is null then
    raise exception 'Documento não encontrado nesta empresa' using errcode = 'P0002';
  end if;

  update public.erp_qualidade_documentos_editor
  set status = 'OBSOLETO', motivo_alteracao = v_motivo, atualizado_em = now()
  where id = v_editor.id and empresa_id = v_empresa;

  update public.erp_qualidade_documentos_revisoes
  set status = 'OBSOLETO', atualizado_em = now()
  where empresa_id = v_empresa
    and codigo_documento = v_editor.codigo_documento
    and status in ('EM_REVISAO', 'REPROVADO', 'VIGENTE', 'ATIVA');

  update public.erp_sgq_documento_anexos
  set status = 'obsoleto', motivo_obsolescencia = v_motivo, atualizado_em = now()
  where empresa_id = v_empresa
    and documento_id = v_editor.id
    and status = 'vigente';

  insert into public.erp_sgq_documento_trilha (
    empresa_id, documento_id, codigo_documento, revisao_numero, evento, ator_nome, detalhe
  ) values (
    v_empresa, v_editor.id, v_editor.codigo_documento, v_editor.revisao, 'obsoleto', v_usuario_nome,
    jsonb_build_object('motivo', v_motivo)
  );

  return jsonb_build_object('documento_id', v_editor.id, 'codigo_documento', v_editor.codigo_documento, 'status', 'OBSOLETO');
end;
$function$;

-- ---------------------------------------------------------------------------
-- 11 · Anexos com versão (abas 5 e 6)
--      O arquivo já está no Storage quando esta function é chamada: ela valida
--      bucket, pasta da empresa, formato e tamanho, e então abre a versão nova.
--      A versão anterior vira obsoleta apontando para a nova — nunca some.
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_documento_anexar(
  p_documento_id uuid,
  p_nome_arquivo text,
  p_storage_path text,
  p_mime_type text,
  p_tamanho_bytes bigint,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_nome text;
  v_editor public.erp_qualidade_documentos_editor%rowtype;
  v_rascunho public.erp_qualidade_documentos_revisoes%rowtype;
  v_nome text := btrim(coalesce(p_nome_arquivo, ''));
  v_path text := btrim(coalesce(p_storage_path, ''));
  v_mime text := lower(btrim(coalesce(p_mime_type, '')));
  v_logico text := lower(btrim(regexp_replace(v_nome, '\.[^./\\]+$', '')));
  v_anteriores uuid[];
  v_versao integer;
  v_anexo_id uuid;
  v_evento text;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;
  if v_nome = '' or v_path = '' or coalesce(p_tamanho_bytes, 0) <= 0 or p_tamanho_bytes > 52428800 then
    raise exception 'Nome, caminho e arquivo de até 50 MB são obrigatórios' using errcode = '22023';
  end if;
  if v_logico = '' then
    raise exception 'O nome do arquivo precisa ter um nome antes da extensão' using errcode = '22023';
  end if;
  if split_part(v_path, '/', 1) <> v_empresa::text then
    raise exception 'O caminho do anexo precisa começar pela pasta da empresa autenticada' using errcode = '42501';
  end if;
  if v_mime not in (
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12','image/png','image/jpeg'
  ) then
    raise exception 'Formato de anexo não permitido no documento controlado' using errcode = '22023';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'erp-qualidade-anexos' and o.name = v_path) then
    raise exception 'Arquivo não encontrado no armazenamento privado do SGQ' using errcode = 'P0002';
  end if;

  select u.id, coalesce(nullif(btrim(u.nome), ''), u.email, 'Usuário do ERP')
    into v_usuario_id, v_usuario_nome
  from public.erp_usuarios u
  where (u.auth_user_id = auth.uid() or u.id = auth.uid())
    and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa da sessão' using errcode = '42501';
  end if;
  if not public.erp_sgq_documento_pode_gravar() then
    raise exception 'Somente responsável da Qualidade ou administrador anexa documento controlado' using errcode = '42501';
  end if;

  select * into v_editor
  from public.erp_qualidade_documentos_editor
  where id = p_documento_id and empresa_id = v_empresa
  for update;

  if v_editor.id is null then
    raise exception 'Documento não encontrado nesta empresa' using errcode = 'P0002';
  end if;

  -- Só a revisão em análise recebe arquivo: mexer no anexo de uma revisão vigente
  -- é alteração de documento e tem que passar por nova revisão e nova aprovação.
  select * into v_rascunho
  from public.erp_qualidade_documentos_revisoes
  where empresa_id = v_empresa
    and codigo_documento = v_editor.codigo_documento
    and status = 'EM_REVISAO'
  order by revisao desc
  limit 1;

  if v_rascunho.id is null then
    raise exception 'Abra uma nova revisão do documento % antes de anexar arquivo', v_editor.codigo_documento using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text || ':' || v_editor.codigo_documento || ':anexo'));

  select coalesce(array_agg(a.id), '{}'::uuid[]) into v_anteriores
  from public.erp_sgq_documento_anexos a
  where a.documento_id = v_editor.id
    and a.nome_logico = v_logico
    and a.status = 'vigente';

  update public.erp_sgq_documento_anexos
  set status = 'obsoleto',
      motivo_obsolescencia = coalesce(nullif(btrim(coalesce(p_motivo, '')), ''), 'substituído por nova versão'),
      atualizado_em = now()
  where id = any (v_anteriores);

  select coalesce(max(a.versao), 0) + 1 into v_versao
  from public.erp_sgq_documento_anexos a
  where a.documento_id = v_editor.id
    and a.nome_logico = v_logico;

  insert into public.erp_sgq_documento_anexos (
    empresa_id, documento_id, codigo_documento, revisao_id, revisao_numero,
    nome_arquivo, nome_logico, storage_path, mime_type, tamanho_bytes,
    versao, status, motivo, criado_por, criado_por_nome
  ) values (
    v_empresa, v_editor.id, v_editor.codigo_documento, v_rascunho.id, v_rascunho.revisao,
    v_nome, v_logico, v_path, v_mime, p_tamanho_bytes,
    v_versao, 'vigente', nullif(btrim(coalesce(p_motivo, '')), ''), v_usuario_id, v_usuario_nome
  ) returning id into v_anexo_id;

  if array_length(v_anteriores, 1) > 0 then
    update public.erp_sgq_documento_anexos
    set substituido_por = v_anexo_id
    where id = any (v_anteriores);
    v_evento := 'anexo_substituido';
  else
    v_evento := 'anexo_vinculado';
  end if;

  update public.erp_qualidade_documentos_revisoes
  set url_anexo = v_path, nome_arquivo = v_nome, atualizado_em = now()
  where id = v_rascunho.id and empresa_id = v_empresa;

  insert into public.erp_sgq_documento_trilha (
    empresa_id, documento_id, codigo_documento, revisao_numero, evento, ator_nome, detalhe
  ) values (
    v_empresa, v_editor.id, v_editor.codigo_documento, v_rascunho.revisao, v_evento, v_usuario_nome,
    jsonb_build_object('arquivo', v_nome, 'versao', v_versao, 'mime', v_mime, 'bytes', p_tamanho_bytes)
  );

  return jsonb_build_object(
    'anexo_id', v_anexo_id,
    'documento_id', v_editor.id,
    'codigo_documento', v_editor.codigo_documento,
    'revisao', v_rascunho.revisao,
    'nome_arquivo', v_nome,
    'versao', v_versao,
    'storage_path', v_path,
    'evento', v_evento
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- 12 · Distribuição controlada e ciência do setor (aba 3)
-- ---------------------------------------------------------------------------
create or replace function public.erp_sgq_documento_distribuir(p_documento_id uuid, p_setores text[], p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_nome text;
  v_editor public.erp_qualidade_documentos_editor%rowtype;
  v_vigente public.erp_qualidade_documentos_revisoes%rowtype;
  v_novas integer := 0;
  v_total integer := 0;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;
  if coalesce(array_length(p_setores, 1), 0) = 0 then
    raise exception 'Selecione pelo menos um setor para distribuir' using errcode = '22023';
  end if;
  if array_length(p_setores, 1) > 40 then
    raise exception 'São no máximo 40 setores por distribuição' using errcode = '22023';
  end if;

  select u.id, coalesce(nullif(btrim(u.nome), ''), u.email, 'Usuário do ERP')
    into v_usuario_id, v_usuario_nome
  from public.erp_usuarios u
  where (u.auth_user_id = auth.uid() or u.id = auth.uid())
    and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa da sessão' using errcode = '42501';
  end if;
  if not public.erp_sgq_documento_pode_gravar() then
    raise exception 'Somente responsável da Qualidade ou administrador distribui documento' using errcode = '42501';
  end if;

  select * into v_editor
  from public.erp_qualidade_documentos_editor
  where id = p_documento_id and empresa_id = v_empresa;

  if v_editor.id is null then
    raise exception 'Documento não encontrado nesta empresa' using errcode = 'P0002';
  end if;

  select * into v_vigente
  from public.erp_qualidade_documentos_revisoes
  where empresa_id = v_empresa
    and codigo_documento = v_editor.codigo_documento
    and status in ('VIGENTE', 'ATIVA')
  order by revisao desc
  limit 1;

  if v_vigente.id is null then
    raise exception 'Só uma revisão aprovada e vigente pode ser distribuída; aprove a revisão % antes', v_editor.revisao using errcode = '22023';
  end if;

  insert into public.erp_sgq_documento_distribuicoes (
    empresa_id, documento_id, codigo_documento, revisao_id, revisao_numero, setor,
    motivo, distribuido_por, distribuido_por_nome
  )
  select v_empresa, v_editor.id, v_editor.codigo_documento, v_vigente.id, v_vigente.revisao,
         btrim(setor_pedido.setor), nullif(btrim(coalesce(p_motivo, '')), ''), v_usuario_id, v_usuario_nome
  from unnest(p_setores) as setor_pedido(setor)
  where btrim(setor_pedido.setor) <> ''
  on conflict (revisao_id, setor) do nothing;

  get diagnostics v_novas = row_count;

  select count(*) into v_total
  from public.erp_sgq_documento_distribuicoes
  where revisao_id = v_vigente.id;

  insert into public.erp_sgq_documento_trilha (
    empresa_id, documento_id, codigo_documento, revisao_numero, evento, ator_nome, detalhe
  ) values (
    v_empresa, v_editor.id, v_editor.codigo_documento, v_vigente.revisao, 'distribuido', v_usuario_nome,
    jsonb_build_object('setores', array(select btrim(setor_pedido.setor) from unnest(p_setores) as setor_pedido(setor) where btrim(setor_pedido.setor) <> ''),
                       'novas', v_novas, 'motivo', nullif(btrim(coalesce(p_motivo, '')), ''))
  );

  return jsonb_build_object(
    'documento_id', v_editor.id,
    'codigo_documento', v_editor.codigo_documento,
    'revisao', v_vigente.revisao,
    'distribuicoes_novas', v_novas,
    'distribuicoes_total', v_total
  );
end;
$function$;

create or replace function public.erp_sgq_documento_confirmar_ciencia(p_distribuicao_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_usuario_nome text;
  v_distribuicao public.erp_sgq_documento_distribuicoes%rowtype;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;

  select u.id, coalesce(nullif(btrim(u.nome), ''), u.email, 'Usuário do ERP')
    into v_usuario_id, v_usuario_nome
  from public.erp_usuarios u
  where (u.auth_user_id = auth.uid() or u.id = auth.uid())
    and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa da sessão' using errcode = '42501';
  end if;

  select * into v_distribuicao
  from public.erp_sgq_documento_distribuicoes
  where id = p_distribuicao_id and empresa_id = v_empresa
  for update;

  if v_distribuicao.id is null then
    raise exception 'Distribuição não encontrada nesta empresa' using errcode = 'P0002';
  end if;
  if v_distribuicao.ciencia_em is not null then
    raise exception 'A ciência deste setor já foi registrada em %', to_char(v_distribuicao.ciencia_em, 'DD/MM/YYYY HH24:MI') using errcode = '22023';
  end if;

  update public.erp_sgq_documento_distribuicoes
  set ciencia_em = now(), ciencia_por = v_usuario_id, ciencia_por_nome = v_usuario_nome
  where id = v_distribuicao.id and empresa_id = v_empresa;

  insert into public.erp_sgq_documento_trilha (
    empresa_id, documento_id, codigo_documento, revisao_numero, evento, ator_nome, detalhe
  ) values (
    v_empresa, v_distribuicao.documento_id, v_distribuicao.codigo_documento, v_distribuicao.revisao_numero,
    'ciencia', v_usuario_nome, jsonb_build_object('setor', v_distribuicao.setor)
  );

  return jsonb_build_object(
    'distribuicao_id', v_distribuicao.id,
    'codigo_documento', v_distribuicao.codigo_documento,
    'setor', v_distribuicao.setor,
    'ciencia_em', now(),
    'ciencia_por', v_usuario_nome
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- 13 · Grants: leitura pelas políticas RLS, escrita só pelas functions acima
-- ---------------------------------------------------------------------------
revoke all on table public.erp_sgq_documento_anexos from public, anon, authenticated;
revoke all on table public.erp_sgq_documento_distribuicoes from public, anon, authenticated;
revoke all on table public.erp_sgq_documento_trilha from public, anon, authenticated;
grant select on table public.erp_sgq_documento_anexos to authenticated;
grant select on table public.erp_sgq_documento_distribuicoes to authenticated;
grant select on table public.erp_sgq_documento_trilha to authenticated;

revoke all on function public.erp_sgq_documento_pode_gravar() from public, anon;
grant execute on function public.erp_sgq_documento_pode_gravar() to authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'erp_sgq_documento_salvar(uuid,text,text,text,text,text,text,text,date,date,text,text,text)',
    'erp_sgq_documento_aprovar(uuid,text)',
    'erp_sgq_documento_devolver(uuid,text)',
    'erp_sgq_documento_obsoletar(uuid,text)',
    'erp_sgq_documento_anexar(uuid,text,text,text,bigint,text)',
    'erp_sgq_documento_distribuir(uuid,text[],text)',
    'erp_sgq_documento_confirmar_ciencia(uuid)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
