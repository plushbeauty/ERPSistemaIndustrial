create table if not exists public.erp_sgq_contadores (
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  chave text not null,
  proximo_valor bigint not null default 1 check (proximo_valor > 0),
  primary key (empresa_id, chave)
);

alter table public.erp_rpnc add column if not exists sgq_origem text;
alter table public.erp_rpnc add column if not exists sgq_severidade text
  check (sgq_severidade in ('Critica', 'Maior', 'Menor'));
alter table public.erp_rpnc add column if not exists setor_id uuid references public.erp_setores(id) on delete set null;
alter table public.erp_rpnc add column if not exists sgq_vinculo_tipo text;
alter table public.erp_rpnc add column if not exists sgq_vinculo_id uuid;
alter table public.erp_rpnc add column if not exists sgq_aberto_por uuid references public.erp_usuarios(id) on delete set null;
alter table public.erp_rpnc add column if not exists sgq_encerrado_por uuid references public.erp_usuarios(id) on delete set null;
alter table public.erp_rpnc add column if not exists sgq_encerrado_em timestamptz;

create table if not exists public.erp_sgq_capa_acoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  rpnc_id uuid not null references public.erp_rpnc(id) on delete cascade,
  tipo text not null check (tipo in ('Contencao', 'Corretiva', 'Preventiva')),
  descricao text not null,
  causa_raiz text,
  responsavel_id uuid not null references public.erp_usuarios(id) on delete restrict,
  prazo date not null,
  status text not null default 'Planejada'
    check (status in ('Planejada', 'Em execucao', 'Concluida', 'Aguardando aprovacao', 'Aprovada', 'Reprovada', 'Verificada')),
  evidencia text,
  comentario_aprovacao text,
  resultado_eficacia text check (resultado_eficacia in ('Eficaz', 'Ineficaz')),
  verificado_por uuid references public.erp_usuarios(id) on delete set null,
  verificado_em timestamptz,
  created_by uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_sgq_auditoria (
  id bigint generated always as identity primary key,
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  entidade text not null,
  entidade_id uuid not null,
  operacao text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  ator_id uuid references public.erp_usuarios(id) on delete restrict,
  ocorrido_em timestamptz not null default now(),
  antes jsonb,
  depois jsonb
);

create table if not exists public.erp_documentos_qualidade_distribuicoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade,
  revisao_id uuid not null references public.erp_documentos_qualidade_revisoes(id) on delete cascade,
  setor_id uuid not null references public.erp_setores(id) on delete cascade,
  distribuido_por uuid references public.erp_usuarios(id) on delete set null,
  distribuido_em timestamptz not null default now(),
  unique (revisao_id, setor_id)
);

alter table public.erp_documentos_qualidade_revisoes add column if not exists area text;
alter table public.erp_documentos_qualidade_revisoes add column if not exists setor text;
alter table public.erp_documentos_qualidade_revisoes add column if not exists tipo text;
alter table public.erp_documentos_qualidade_revisoes add column if not exists validade_ate date;

create table if not exists public.erp_documentos_qualidade_leituras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade,
  revisao_id uuid not null references public.erp_documentos_qualidade_revisoes(id) on delete cascade,
  distribuicao_id uuid not null references public.erp_documentos_qualidade_distribuicoes(id) on delete cascade,
  usuario_id uuid not null references public.erp_usuarios(id) on delete cascade,
  leitura_obrigatoria boolean not null default true,
  lido_em timestamptz,
  unique (revisao_id, usuario_id)
);

create index if not exists idx_sgq_rpncs_empresa_status on public.erp_rpnc (empresa_id, status, criado_em desc) where sgq_origem is not null;
create index if not exists idx_sgq_rpncs_empresa_setor on public.erp_rpnc (empresa_id, setor_id, status) where sgq_origem is not null;
create unique index if not exists uq_sgq_rpncs_numero_empresa on public.erp_rpnc (empresa_id, numero_rpnc) where sgq_origem is not null;
create index if not exists idx_sgq_capa_rpnc_status on public.erp_sgq_capa_acoes (empresa_id, rpnc_id, status, prazo);
create index if not exists idx_sgq_auditoria_empresa_entidade on public.erp_sgq_auditoria (empresa_id, entidade, entidade_id, ocorrido_em desc);
create index if not exists idx_sgq_distribuicoes_revision on public.erp_documentos_qualidade_distribuicoes (empresa_id, revisao_id);
create index if not exists idx_sgq_leituras_usuario_pendente on public.erp_documentos_qualidade_leituras (empresa_id, usuario_id, lido_em);

alter table public.erp_sgq_capa_acoes enable row level security;
alter table public.erp_sgq_auditoria enable row level security;
alter table public.erp_sgq_contadores enable row level security;
alter table public.erp_documentos_qualidade_distribuicoes enable row level security;
alter table public.erp_documentos_qualidade_leituras enable row level security;

drop policy if exists sgq_capa_select on public.erp_sgq_capa_acoes;
drop policy if exists sgq_capa_insert on public.erp_sgq_capa_acoes;
drop policy if exists sgq_capa_update on public.erp_sgq_capa_acoes;
drop policy if exists sgq_auditoria_select on public.erp_sgq_auditoria;
drop policy if exists sgq_distribuicoes_select on public.erp_documentos_qualidade_distribuicoes;
drop policy if exists sgq_leituras_select on public.erp_documentos_qualidade_leituras;

create policy sgq_capa_select on public.erp_sgq_capa_acoes for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));
create policy sgq_capa_insert on public.erp_sgq_capa_acoes for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'criar'));
create policy sgq_capa_update on public.erp_sgq_capa_acoes for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'))
  with check (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'editar'));
create policy sgq_auditoria_select on public.erp_sgq_auditoria for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_has_permission('qualidade', 'ver'));
create policy sgq_distribuicoes_select on public.erp_documentos_qualidade_distribuicoes for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() and public.erp_qms_can('qualidade_documentos', 'visualizar'));
create policy sgq_leituras_select on public.erp_documentos_qualidade_leituras for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (usuario_id = (select usuario_id from public.erp_qms_current_user())
      or public.erp_qms_can('qualidade_documentos', 'visualizar'))
  );

create or replace function public.erp_qms_protect_revision()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Revisões documentais não podem ser excluídas.'; end if;
  if new.id is distinct from old.id or new.documento_id is distinct from old.documento_id
    or new.empresa_id is distinct from old.empresa_id or new.revisao is distinct from old.revisao
    or new.criado_por is distinct from old.criado_por or new.criado_em is distinct from old.criado_em then
    raise exception 'A identidade da revisão é imutável.';
  end if;
  if new.status is distinct from old.status then
    if current_setting('app.qms_revision_workflow', true) is distinct from 'workflow'
      or not (
        (old.status = 'rascunho' and new.status = 'em_revisao')
        or (old.status = 'em_revisao' and new.status = 'aprovada')
        or (old.status = 'aprovada' and new.status = 'vigente')
        or (old.status in ('vigente','liberada') and new.status = 'substituida')
      ) then raise exception 'A transição de revisão deve ocorrer pelo workflow autorizado.'; end if;
  end if;
  if old.status <> 'rascunho' and (
    new.titulo is distinct from old.titulo or new.conteudo is distinct from old.conteudo
    or new.motivo_alteracao is distinct from old.motivo_alteracao
    or new.area is distinct from old.area or new.setor is distinct from old.setor
    or new.tipo is distinct from old.tipo or new.validade_ate is distinct from old.validade_ate
  ) then raise exception 'Conteúdo de revisão enviada ou aprovada é imutável.'; end if;
  if old.status = 'rascunho' and nullif(btrim(new.motivo_alteracao),'') is null then
    raise exception 'O motivo da revisão é obrigatório.';
  end if;
  return new;
end
$$;

drop trigger if exists trg_erp_qms_protect_revision on public.erp_documentos_qualidade_revisoes;
create trigger trg_erp_qms_protect_revision before update or delete on public.erp_documentos_qualidade_revisoes
  for each row execute function public.erp_qms_protect_revision();

create or replace function public.erp_qms_protect_document()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then raise exception 'Documentos controlados não podem ser excluídos; registre sua obsolescência.'; end if;
  if coalesce(current_setting('app.qms_document_workflow', true),'') not in ('create','workflow') then
    raise exception 'Documentos controlados só podem ser alterados pelo fluxo de revisão aprovado.';
  end if;
  return new;
end
$$;

drop trigger if exists trg_erp_qms_protect_document on public.erp_documentos_qualidade;
create trigger trg_erp_qms_protect_document before update or delete on public.erp_documentos_qualidade
  for each row execute function public.erp_qms_protect_document();

create or replace function public.erp_sgq_auditar_mutacao()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid;
  v_actor uuid;
begin
  if tg_table_name = 'erp_rpnc' and coalesce(to_jsonb(new)->>'sgq_origem', to_jsonb(old)->>'sgq_origem') is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  v_empresa := coalesce((to_jsonb(new)->>'empresa_id')::uuid, (to_jsonb(old)->>'empresa_id')::uuid);
  select u.id into v_actor from public.erp_usuarios u
    where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null limit 1;
  insert into public.erp_sgq_auditoria (empresa_id, entidade, entidade_id, operacao, ator_id, antes, depois)
  values (
    v_empresa,
    tg_table_name,
    coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid),
    tg_op,
    v_actor,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$$;

create or replace function public.erp_sgq_proteger_auditoria()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  raise exception 'O registro de auditoria é imutável.';
end
$$;

create or replace function public.erp_sgq_validar_capa_tenant()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare
  v_actor uuid;
begin
  if not exists (
    select 1 from public.erp_rpnc r
    where r.id=new.rpnc_id and r.empresa_id=new.empresa_id
  ) then raise exception 'A RPNC da ação CAPA não pertence à empresa informada.'; end if;
  if not exists (
    select 1 from public.erp_usuarios u
    where u.id=new.responsavel_id and u.empresa_id=new.empresa_id and u.ativo=true and u.deleted_at is null
  ) then raise exception 'O responsável CAPA não pertence à empresa ou está inativo.'; end if;
  if tg_op='UPDATE' and (new.empresa_id is distinct from old.empresa_id or new.rpnc_id is distinct from old.rpnc_id) then
    raise exception 'A ação CAPA não pode ser movida entre empresas ou RPNCs.';
  end if;
  if tg_op='INSERT' and new.created_by is null then
    select u.id into v_actor from public.erp_usuarios u
      where u.auth_user_id=auth.uid() and u.empresa_id=new.empresa_id and u.ativo=true and u.deleted_at is null limit 1;
    if v_actor is null then raise exception 'Usuário ERP ativo não identificado para a ação CAPA.'; end if;
    new.created_by := v_actor;
  end if;
  return new;
end
$$;

drop trigger if exists trg_sgq_capa_tenant on public.erp_sgq_capa_acoes;
create trigger trg_sgq_capa_tenant before insert or update on public.erp_sgq_capa_acoes
  for each row execute function public.erp_sgq_validar_capa_tenant();

drop trigger if exists trg_sgq_auditoria_immutable on public.erp_sgq_auditoria;
create trigger trg_sgq_auditoria_immutable before update or delete on public.erp_sgq_auditoria
  for each row execute function public.erp_sgq_proteger_auditoria();
drop trigger if exists trg_sgq_rpncs_audit on public.erp_rpnc;
create trigger trg_sgq_rpncs_audit after insert or update or delete on public.erp_rpnc
  for each row execute function public.erp_sgq_auditar_mutacao();
drop trigger if exists trg_sgq_capa_audit on public.erp_sgq_capa_acoes;
create trigger trg_sgq_capa_audit after insert or update or delete on public.erp_sgq_capa_acoes
  for each row execute function public.erp_sgq_auditar_mutacao();
drop trigger if exists trg_sgq_documentos_audit on public.erp_documentos_qualidade;
create trigger trg_sgq_documentos_audit after insert or update or delete on public.erp_documentos_qualidade
  for each row execute function public.erp_sgq_auditar_mutacao();
drop trigger if exists trg_sgq_documentos_revisoes_audit on public.erp_documentos_qualidade_revisoes;
create trigger trg_sgq_documentos_revisoes_audit after insert or update or delete on public.erp_documentos_qualidade_revisoes
  for each row execute function public.erp_sgq_auditar_mutacao();

create or replace function public.erp_sgq_abrir_rpnc(
  p_descricao text,
  p_origem text,
  p_severidade text,
  p_setor_id uuid default null,
  p_linked_entity_type text default null,
  p_linked_entity_id uuid default null
) returns public.erp_rpnc
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_numero bigint;
  v_result public.erp_rpnc;
begin
  if v_empresa is null then raise exception 'Empresa não identificada.'; end if;
  if not public.erp_has_permission('qualidade', 'criar') then raise exception 'Sem permissão para abrir RPNC.'; end if;
  if nullif(btrim(p_descricao), '') is null or nullif(btrim(p_origem), '') is null then
    raise exception 'Descrição e origem são obrigatórias.';
  end if;
  if p_severidade is null or p_severidade not in ('Critica', 'Maior', 'Menor') then raise exception 'Gravidade inválida.'; end if;
  if p_setor_id is null or not exists (
    select 1 from public.erp_setores s where s.id = p_setor_id and s.empresa_id = v_empresa and s.ativo = true
  ) then raise exception 'Setor inválido para a empresa.'; end if;
  select u.id into v_usuario from public.erp_usuarios u
    where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null limit 1;
  if v_usuario is null then raise exception 'Usuário ERP ativo não identificado.'; end if;
  insert into public.erp_sgq_contadores (empresa_id, chave, proximo_valor)
    values (v_empresa, 'RPNC-' || to_char(current_date, 'YYYY'), 1)
    on conflict (empresa_id, chave) do update set proximo_valor = public.erp_sgq_contadores.proximo_valor + 1
    returning proximo_valor into v_numero;
  while exists (
    select 1 from public.erp_rpnc
    where empresa_id=v_empresa
      and numero_rpnc='RPNC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_numero::text, 6, '0')
  ) loop
    update public.erp_sgq_contadores set proximo_valor=proximo_valor+1
      where empresa_id=v_empresa and chave='RPNC-' || to_char(current_date, 'YYYY')
      returning proximo_valor-1 into v_numero;
  end loop;
  perform set_config('app.sgq_rpnc_open','open',true);
  insert into public.erp_rpnc (
    empresa_id, numero_rpnc, descricao_nao_conformidade, status, acao_corretiva,
    sgq_origem, sgq_severidade, setor_id, sgq_vinculo_tipo, sgq_vinculo_id, sgq_aberto_por
  ) values (
    v_empresa, 'RPNC-' || to_char(current_date, 'YYYY') || '-' || lpad(v_numero::text, 6, '0'),
    btrim(p_descricao), 'aberta', btrim(p_descricao), btrim(p_origem), p_severidade, p_setor_id,
    nullif(btrim(p_linked_entity_type), ''), p_linked_entity_id, v_usuario
  ) returning * into v_result;
  return v_result;
end
$$;

create or replace function public.erp_sgq_transicionar_rpnc(p_rpnc_id uuid, p_status text)
returns public.erp_rpnc
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_row public.erp_rpnc;
begin
  if not public.erp_has_permission('qualidade', 'editar') then raise exception 'Sem permissão para atualizar RPNC.'; end if;
  if p_status is null or p_status not in ('aberta','em análise','em tratamento','aguardando eficácia','encerrada') then
    raise exception 'Status de RPNC inválido.';
  end if;
  select u.id into v_user from public.erp_usuarios u where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true limit 1;
  update public.erp_rpnc set
    status = p_status,
    sgq_encerrado_por = case when p_status = 'encerrada' then v_user else sgq_encerrado_por end,
    sgq_encerrado_em = case when p_status = 'encerrada' then now() else sgq_encerrado_em end
  where id = p_rpnc_id and empresa_id = v_empresa and sgq_origem is not null
  returning * into v_row;
  if not found then raise exception 'RPNC não encontrada.'; end if;
  return v_row;
end
$$;

create or replace function public.erp_sgq_validar_transicao_capa()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.id is distinct from old.id or new.empresa_id is distinct from old.empresa_id
    or new.rpnc_id is distinct from old.rpnc_id or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'A identidade da ação CAPA é imutável.';
  end if;
  if old.status in ('Aprovada','Verificada') and (
    new.tipo is distinct from old.tipo or new.descricao is distinct from old.descricao
    or new.causa_raiz is distinct from old.causa_raiz or new.responsavel_id is distinct from old.responsavel_id
    or new.prazo is distinct from old.prazo
  ) then raise exception 'A ação aprovada é imutável; registre uma nova ação para alterar o plano.'; end if;
  if (new.comentario_aprovacao is distinct from old.comentario_aprovacao
      or new.resultado_eficacia is distinct from old.resultado_eficacia
      or new.verificado_por is distinct from old.verificado_por
      or new.verificado_em is distinct from old.verificado_em)
    and coalesce(current_setting('app.sgq_capa_decision',true),'') <> 'decision' then
    raise exception 'Decisões e resultado da eficácia só podem ser registrados pelo workflow autorizado.';
  end if;
  if new.evidencia is distinct from old.evidencia
    and new.status is not distinct from old.status
    and coalesce(current_setting('app.sgq_capa_decision',true),'') <> 'decision' then
    raise exception 'A evidência só pode ser registrada na submissão ou decisão da ação.';
  end if;
  if new.status is distinct from old.status then
    if new.status in ('Aprovada','Reprovada') then
      if old.status <> 'Aguardando aprovacao' or not public.erp_has_permission('qualidade','aprovar')
        or coalesce(current_setting('app.sgq_capa_decision',true),'') <> 'decision' then
        raise exception 'Aprovação CAPA não autorizada ou fora da etapa de aprovação.';
      end if;
    elsif new.status = 'Verificada' then
      if old.status <> 'Aprovada'
        or not public.erp_has_permission('qualidade','verificar')
        or coalesce(current_setting('app.sgq_capa_decision',true),'') <> 'decision'
        or nullif(btrim(new.evidencia),'') is null
        or new.resultado_eficacia is null then
        raise exception 'Verificação requer ação aprovada, evidência e permissão de verificação.';
      end if;
    elsif new.status = 'Aguardando aprovacao' then
      if old.status <> 'Concluida' or nullif(btrim(new.evidencia),'') is null
        or nullif(btrim(new.causa_raiz),'') is null
        or not public.erp_has_permission('qualidade','editar') then
        raise exception 'Ações concluídas exigem causa raiz e evidência para aprovação.';
      end if;
    elsif new.status = 'Em execucao' then
      if old.status not in ('Planejada','Reprovada') or not public.erp_has_permission('qualidade','editar') then
        raise exception 'Transição de ação CAPA não permitida.';
      end if;
    elsif new.status = 'Concluida' then
      if old.status <> 'Em execucao' or not public.erp_has_permission('qualidade','editar') then
        raise exception 'Transição de ação CAPA não permitida.';
      end if;
    elsif not public.erp_has_permission('qualidade','editar') then
      raise exception 'Sem permissão para atualizar ação CAPA.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_sgq_capa_transition on public.erp_sgq_capa_acoes;
create trigger trg_sgq_capa_transition before update on public.erp_sgq_capa_acoes
  for each row execute function public.erp_sgq_validar_transicao_capa();

create or replace function public.erp_sgq_validar_transicao_rpnc()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
declare
  v_actor uuid;
begin
  if old.sgq_origem is null and new.sgq_origem is null then return new; end if;
  if new.id is distinct from old.id or new.criado_em is distinct from old.criado_em
    or new.numero_rpnc is distinct from old.numero_rpnc
    or new.descricao_nao_conformidade is distinct from old.descricao_nao_conformidade
    or new.acao_corretiva is distinct from old.acao_corretiva
    or new.sgq_origem is distinct from old.sgq_origem
    or new.sgq_severidade is distinct from old.sgq_severidade
    or new.setor_id is distinct from old.setor_id
    or new.sgq_vinculo_tipo is distinct from old.sgq_vinculo_tipo
    or new.sgq_vinculo_id is distinct from old.sgq_vinculo_id
    or new.sgq_aberto_por is distinct from old.sgq_aberto_por
    or new.empresa_id is distinct from old.empresa_id then
    raise exception 'Os dados de abertura da RPNC são imutáveis; registre a alteração em uma tratativa.';
  end if;
  if (new.status is not distinct from old.status or new.status not in ('encerrada','Encerrada'))
    and (new.sgq_encerrado_por is distinct from old.sgq_encerrado_por
      or new.sgq_encerrado_em is distinct from old.sgq_encerrado_em) then
    raise exception 'Os dados de encerramento só podem ser definidos ao encerrar a RPNC.';
  end if;
  if new.status is distinct from old.status then
    if not public.erp_has_permission('qualidade','editar') then raise exception 'Sem permissão para atualizar RPNC.'; end if;
    if not (
      (old.status in ('aberta','Aberta') and new.status in ('em análise','Investigacao'))
      or (old.status in ('em análise','Investigacao') and new.status in ('em tratamento','Acao corretiva'))
      or (old.status in ('em tratamento','Acao corretiva') and new.status in ('aguardando eficácia','Aguardando aprovacao'))
      or (old.status in ('aguardando eficácia','Aguardando aprovacao') and new.status in ('encerrada','Encerrada'))
    ) then raise exception 'Transição de RPNC não permitida.'; end if;
    if new.status in ('encerrada','Encerrada') and (
      not exists (
        select 1 from public.erp_sgq_capa_acoes a
        where a.rpnc_id=new.id and a.empresa_id=new.empresa_id
          and a.status='Verificada' and a.resultado_eficacia='Eficaz'
          and nullif(btrim(a.causa_raiz),'') is not null
      )
      or exists (
        select 1 from public.erp_sgq_capa_acoes a
        where a.rpnc_id=new.id and a.empresa_id=new.empresa_id
          and (a.status <> 'Verificada' or a.resultado_eficacia is distinct from 'Eficaz'
            or nullif(btrim(a.causa_raiz),'') is null)
      )
    ) then
      raise exception 'A RPNC exige ação aprovada, causa raiz e eficácia verificada como eficaz.';
    end if;
    if new.status in ('encerrada','Encerrada') then
      select u.id into v_actor from public.erp_usuarios u
        where u.auth_user_id=auth.uid() and u.empresa_id=new.empresa_id and u.ativo=true and u.deleted_at is null limit 1;
      if v_actor is null then raise exception 'Usuário ERP ativo não identificado para o encerramento.'; end if;
      new.sgq_encerrado_por := v_actor;
      new.sgq_encerrado_em := now();
    end if;
  end if;
  return new;
end
$$;

create or replace function public.erp_sgq_proteger_rpnc()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then
    if old.sgq_origem is not null then raise exception 'RPNCs do SGQ não podem ser excluídas.'; end if;
    return old;
  end if;
  if new.sgq_origem is not null then
    if coalesce(current_setting('app.sgq_rpnc_open', true),'') <> 'open'
      or new.empresa_id is distinct from public.erp_current_empresa_id()
      or nullif(btrim(new.sgq_origem),'') is null
      or new.sgq_severidade is null or new.sgq_severidade not in ('Critica','Maior','Menor')
      or new.setor_id is null or new.sgq_aberto_por is null then
      raise exception 'A abertura de RPNC deve ocorrer pelo fluxo autorizado do SGQ.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists trg_sgq_rpnc_guard on public.erp_rpnc;
create trigger trg_sgq_rpnc_guard before insert or delete on public.erp_rpnc
  for each row execute function public.erp_sgq_proteger_rpnc();

drop trigger if exists trg_sgq_rpncs_transition on public.erp_rpnc;
create trigger trg_sgq_rpncs_transition before update on public.erp_rpnc
  for each row execute function public.erp_sgq_validar_transicao_rpnc();

create or replace function public.erp_sgq_capa_decidir(p_acao_id uuid, p_decisao text, p_evidencia text default null)
returns public.erp_sgq_capa_acoes
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_row public.erp_sgq_capa_acoes;
begin
  if p_decisao is null or p_decisao not in ('aprovar','reprovar','verificar_eficaz','verificar_ineficaz') then raise exception 'Decisão inválida.'; end if;
  if p_decisao like 'verificar_%' and nullif(btrim(p_evidencia),'') is null then
    raise exception 'A evidência da verificação de eficácia é obrigatória.';
  end if;
  if p_decisao in ('aprovar','reprovar') and not public.erp_has_permission('qualidade', 'aprovar') then raise exception 'Sem permissão para aprovar CAPA.'; end if;
  if p_decisao in ('verificar_eficaz','verificar_ineficaz') and not public.erp_has_permission('qualidade', 'verificar') then raise exception 'Sem permissão para verificar eficácia.'; end if;
  select u.id into v_user from public.erp_usuarios u where u.auth_user_id = auth.uid() and u.empresa_id = v_empresa and u.ativo = true and u.deleted_at is null limit 1;
  if v_user is null then raise exception 'Usuário ERP ativo não identificado.'; end if;
  perform set_config('app.sgq_capa_decision','decision',true);
  update public.erp_sgq_capa_acoes set
    status = case p_decisao when 'aprovar' then 'Aprovada' when 'reprovar' then 'Reprovada' else 'Verificada' end,
    resultado_eficacia = case p_decisao when 'verificar_eficaz' then 'Eficaz' when 'verificar_ineficaz' then 'Ineficaz' else resultado_eficacia end,
    evidencia = case when p_decisao like 'verificar_%' then coalesce(nullif(btrim(p_evidencia), ''), evidencia) else evidencia end,
    comentario_aprovacao = case when p_decisao in ('aprovar','reprovar') then nullif(btrim(p_evidencia), '') else comentario_aprovacao end,
    verificado_por = case when p_decisao like 'verificar_%' then v_user else verificado_por end,
    verificado_em = case when p_decisao like 'verificar_%' then now() else verificado_em end,
    updated_at = now()
  where id = p_acao_id and empresa_id = v_empresa
  returning * into v_row;
  if not found then raise exception 'Ação CAPA não encontrada.'; end if;
  return v_row;
end
$$;

create or replace function public.erp_qms_criar_documento(
  p_codigo text, p_titulo text, p_departamento text, p_tipo text, p_conteudo text, p_motivo text
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_doc uuid;
  v_rev uuid;
begin
  if v_empresa is null then raise exception 'Empresa não identificada.'; end if;
  if not public.erp_qms_can('qualidade_documentos','criar') then raise exception 'Sem permissão para criar documentos.'; end if;
  if nullif(btrim(p_codigo),'') is null or nullif(btrim(p_titulo),'') is null or nullif(btrim(p_motivo),'') is null then
    raise exception 'Código, título e motivo são obrigatórios.';
  end if;
  perform pg_advisory_xact_lock(hashtext(v_empresa::text), hashtext(upper(btrim(p_codigo))));
  if exists (select 1 from public.erp_documentos_qualidade where empresa_id=v_empresa and upper(codigo)=upper(btrim(p_codigo))) then
    raise exception 'Já existe um documento com este código nesta empresa.';
  end if;
  select usuario_id into v_usuario from public.erp_qms_current_user() limit 1;
  insert into public.erp_documentos_qualidade (
    empresa_id, codigo, titulo, area, tipo, revisao, status, conteudo, motivo_alteracao,
    distribuicao_controlada, preparado_por, data_criacao, updated_at
  ) values (
    v_empresa, btrim(p_codigo), btrim(p_titulo), nullif(btrim(p_departamento), ''),
    coalesce(nullif(btrim(p_tipo), ''), 'Procedimento'), 1, 'rascunho',
    coalesce(p_conteudo, ''), btrim(p_motivo), true, v_usuario, current_date, now()
  ) returning id into v_doc;
  insert into public.erp_documentos_qualidade_revisoes (
    documento_id, empresa_id, revisao, status, titulo, conteudo, motivo_alteracao, criado_por,
    area, tipo
  ) values (v_doc, v_empresa, 1, 'rascunho', btrim(p_titulo), coalesce(p_conteudo, ''), btrim(p_motivo), v_usuario,
    nullif(btrim(p_departamento), ''), coalesce(nullif(btrim(p_tipo), ''), 'Procedimento'))
  returning id into v_rev;
  perform set_config('app.qms_document_workflow','create',true);
  update public.erp_documentos_qualidade set revisao_atual_id = v_rev where id = v_doc;
  return jsonb_build_object('documento_id',v_doc,'revisao_id',v_rev,'revisao',1);
end
$$;

create or replace function public.erp_qms_criar_revisao(p_documento_id uuid, p_motivo text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_doc public.erp_documentos_qualidade;
  v_rev integer;
  v_rev_id uuid;
begin
  if not public.erp_qms_can('qualidade_documentos','editar') then raise exception 'Sem permissão para criar revisão.'; end if;
  if nullif(btrim(p_motivo),'') is null then raise exception 'Motivo da revisão é obrigatório.'; end if;
  select * into v_doc from public.erp_documentos_qualidade
    where id = p_documento_id and empresa_id = v_empresa for update;
  if not found then raise exception 'Documento não encontrado.'; end if;
  if exists (select 1 from public.erp_documentos_qualidade_revisoes where documento_id=p_documento_id and status='rascunho') then
    raise exception 'Já existe uma revisão em rascunho para este documento.';
  end if;
  select usuario_id into v_usuario from public.erp_qms_current_user() limit 1;
  select coalesce(max(revisao),0)+1 into v_rev from public.erp_documentos_qualidade_revisoes where documento_id=p_documento_id;
  insert into public.erp_documentos_qualidade_revisoes (
    documento_id, empresa_id, revisao, status, titulo, conteudo, motivo_alteracao, criado_por,
    area, setor, tipo, validade_ate
  ) values (p_documento_id, v_empresa, v_rev, 'rascunho', v_doc.titulo, coalesce(v_doc.conteudo,''), btrim(p_motivo), v_usuario,
    v_doc.area, v_doc.setor, v_doc.tipo, v_doc.validade_ate)
  returning id into v_rev_id;
  return jsonb_build_object('revisao_id',v_rev_id,'revisao',v_rev);
end
$$;

create or replace function public.erp_qms_salvar_revisao(
  p_documento_id uuid, p_titulo text, p_departamento text, p_setor text, p_tipo text,
  p_conteudo text, p_motivo text, p_validade date default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_doc public.erp_documentos_qualidade;
  v_revision public.erp_documentos_qualidade_revisoes;
begin
  if not public.erp_qms_can('qualidade_documentos','editar') then raise exception 'Sem permissão para editar documentos.'; end if;
  if nullif(btrim(p_titulo),'') is null or nullif(btrim(p_motivo),'') is null then raise exception 'Título e motivo são obrigatórios.'; end if;
  select * into v_doc from public.erp_documentos_qualidade where id=p_documento_id and empresa_id=v_empresa for update;
  if not found then raise exception 'Documento não encontrado.'; end if;
  select * into v_revision from public.erp_documentos_qualidade_revisoes
    where documento_id=p_documento_id and empresa_id=v_empresa and status='rascunho'
    order by revisao desc limit 1 for update;
  if not found or v_revision.status <> 'rascunho' then raise exception 'O conteúdo somente pode mudar na revisão em rascunho.'; end if;
  update public.erp_documentos_qualidade_revisoes set
    titulo=btrim(p_titulo), conteudo=coalesce(p_conteudo,''), motivo_alteracao=btrim(p_motivo),
    area=nullif(btrim(p_departamento),''), setor=nullif(btrim(p_setor), ''),
    tipo=coalesce(nullif(btrim(p_tipo),''),'Procedimento'), validade_ate=p_validade
  where id=v_revision.id;
  return jsonb_build_object('revisao_id',v_revision.id,'revisao',v_revision.revisao);
end
$$;

create or replace function public.erp_qms_transicionar_revisao(p_revision_id uuid, p_acao text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_revision public.erp_documentos_qualidade_revisoes;
  v_next text;
  v_permission text;
begin
  select * into v_revision from public.erp_documentos_qualidade_revisoes
    where id=p_revision_id and empresa_id=v_empresa for update;
  if not found then raise exception 'Revisão não encontrada.'; end if;
  select usuario_id into v_user from public.erp_qms_current_user() limit 1;
  if p_acao='enviar_revisao' then v_next:='em_revisao'; v_permission:='revisar';
  elsif p_acao='aprovar' then v_next:='aprovada'; v_permission:='aprovar';
  elsif p_acao='liberar' then v_next:='vigente'; v_permission:='liberar';
  else raise exception 'Ação de workflow inválida.'; end if;
  if not public.erp_qms_can('qualidade_documentos',v_permission) then raise exception 'Sem permissão para esta etapa.'; end if;
  if (p_acao='enviar_revisao' and v_revision.status<>'rascunho')
    or (p_acao='aprovar' and v_revision.status<>'em_revisao')
    or (p_acao='liberar' and v_revision.status<>'aprovada') then
    raise exception 'Transição não permitida para o estado atual.';
  end if;
  perform set_config('app.qms_revision_workflow','workflow',true);
  if p_acao='liberar' then
    update public.erp_documentos_qualidade_revisoes set status='substituida'
      where documento_id=v_revision.documento_id and id<>v_revision.id and status in ('vigente','liberada');
    update public.erp_documentos_qualidade_revisoes set status='vigente', liberado_por=v_user,
      liberado_em=now(), data_efetiva=now() where id=v_revision.id;
    perform set_config('app.qms_document_workflow','workflow',true);
    update public.erp_documentos_qualidade set status='vigente', revisao=v_revision.revisao,
      revisao_atual_id=v_revision.id, titulo=v_revision.titulo, conteudo=v_revision.conteudo,
      area=v_revision.area, setor=v_revision.setor, tipo=v_revision.tipo, validade_ate=v_revision.validade_ate,
      data_emissao=current_date, data_revisao=now(), updated_at=now()
      where id=v_revision.documento_id;
  elsif p_acao='aprovar' then
    update public.erp_documentos_qualidade_revisoes set status=v_next, aprovado_por=v_user, aprovado_em=now()
      where id=v_revision.id;
  else
    update public.erp_documentos_qualidade_revisoes set status=v_next, revisado_por=v_user, revisado_em=now()
      where id=v_revision.id;
  end if;
  if p_acao='aprovar' then
    insert into public.erp_documentos_qualidade_aprovacoes (
      documento_id, revisao_id, empresa_id, aprovador_id, etapa, decisao
    ) values (v_revision.documento_id, v_revision.id, v_empresa, v_user, 'aprovacao', 'aprovado');
  end if;
  return jsonb_build_object('status',v_next,'revisao_id',v_revision.id);
end
$$;

create or replace function public.erp_qms_distribuir_revisao(p_revision_id uuid, p_setores uuid[])
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_documento uuid;
  v_user uuid;
  v_count integer;
begin
  if not public.erp_qms_can('qualidade_documentos','liberar') then raise exception 'Sem permissão para distribuir documentos.'; end if;
  select documento_id into v_documento from public.erp_documentos_qualidade_revisoes
    where id=p_revision_id and empresa_id=v_empresa and status='vigente' and nullif(btrim(conteudo),'') is not null;
  if v_documento is null then raise exception 'Somente revisões vigentes com conteúdo podem ser distribuídas.'; end if;
  if coalesce(cardinality(p_setores),0)=0 then raise exception 'Selecione ao menos um setor.'; end if;
  select usuario_id into v_user from public.erp_qms_current_user() limit 1;
  if exists (select 1 from unnest(p_setores) x where not exists (
    select 1 from public.erp_setores s where s.id=x and s.empresa_id=v_empresa and s.ativo=true
  )) then raise exception 'Um ou mais setores não pertencem à empresa ativa.'; end if;
  insert into public.erp_documentos_qualidade_distribuicoes (empresa_id,documento_id,revisao_id,setor_id,distribuido_por)
    select v_empresa,v_documento,p_revision_id,x,v_user from unnest(p_setores) x
    on conflict (revisao_id,setor_id) do nothing;
  insert into public.erp_documentos_qualidade_leituras (empresa_id,documento_id,revisao_id,distribuicao_id,usuario_id)
    select v_empresa,v_documento,p_revision_id,d.id,u.id
    from public.erp_documentos_qualidade_distribuicoes d
    join public.erp_usuarios u on u.empresa_id=v_empresa and u.setor_id=d.setor_id
      and u.ativo=true and u.deleted_at is null
    where d.revisao_id=p_revision_id and d.setor_id=any(p_setores)
    on conflict (revisao_id,usuario_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

create or replace function public.erp_qms_confirmar_leitura(p_leitura_id uuid)
returns timestamptz language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_user uuid;
  v_read public.erp_documentos_qualidade_leituras;
begin
  select usuario_id into v_user from public.erp_qms_current_user() limit 1;
  update public.erp_documentos_qualidade_leituras set lido_em=coalesce(lido_em,now())
    where id=p_leitura_id and empresa_id=v_empresa and usuario_id=v_user returning * into v_read;
  if not found then raise exception 'Atribuição de leitura não encontrada para este usuário.'; end if;
  insert into public.erp_documentos_qualidade_ciencia (documento_id,revisao_id,empresa_id,usuario_id)
    values (v_read.documento_id,v_read.revisao_id,v_empresa,v_user)
    on conflict (revisao_id,usuario_id) do nothing;
  return v_read.lido_em;
end
$$;

revoke all on function public.erp_sgq_abrir_rpnc(text,text,text,uuid,text,uuid) from public;
revoke all on function public.erp_sgq_transicionar_rpnc(uuid,text) from public;
revoke all on function public.erp_sgq_capa_decidir(uuid,text,text) from public;
revoke all on function public.erp_qms_criar_documento(text,text,text,text,text,text) from public;
revoke all on function public.erp_qms_criar_revisao(uuid,text) from public;
revoke all on function public.erp_qms_salvar_revisao(uuid,text,text,text,text,text,text,date) from public;
revoke all on function public.erp_qms_transicionar_revisao(uuid,text) from public;
revoke all on function public.erp_qms_distribuir_revisao(uuid,uuid[]) from public;
revoke all on function public.erp_qms_confirmar_leitura(uuid) from public;
grant execute on function public.erp_sgq_abrir_rpnc(text,text,text,uuid,text,uuid) to authenticated;
grant execute on function public.erp_sgq_transicionar_rpnc(uuid,text) to authenticated;
grant execute on function public.erp_sgq_capa_decidir(uuid,text,text) to authenticated;
grant execute on function public.erp_qms_criar_documento(text,text,text,text,text,text) to authenticated;
grant execute on function public.erp_qms_criar_revisao(uuid,text) to authenticated;
grant execute on function public.erp_qms_salvar_revisao(uuid,text,text,text,text,text,text,date) to authenticated;
grant execute on function public.erp_qms_transicionar_revisao(uuid,text) to authenticated;
grant execute on function public.erp_qms_distribuir_revisao(uuid,uuid[]) to authenticated;
grant execute on function public.erp_qms_confirmar_leitura(uuid) to authenticated;
revoke all on public.erp_sgq_contadores, public.erp_sgq_capa_acoes, public.erp_sgq_auditoria,
  public.erp_documentos_qualidade_distribuicoes, public.erp_documentos_qualidade_leituras from public, anon, authenticated;
grant select on public.erp_sgq_capa_acoes, public.erp_sgq_auditoria,
  public.erp_documentos_qualidade_distribuicoes, public.erp_documentos_qualidade_leituras to authenticated;
grant insert, update on public.erp_sgq_capa_acoes to authenticated;
