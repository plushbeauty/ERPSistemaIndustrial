create table if not exists public.erp_documentos_qualidade_revisoes (
  id uuid primary key default gen_random_uuid(), documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade, empresa_id uuid not null,
  revisao integer not null, status text not null default 'rascunho' check (status in ('rascunho','solicitada_alteracao','em_revisao','aprovada','liberada','vigente','substituida','obsoleta')),
  titulo text not null, conteudo text, motivo_alteracao text, criado_por uuid references public.erp_usuarios(id), revisado_por uuid references public.erp_usuarios(id), aprovado_por uuid references public.erp_usuarios(id), liberado_por uuid references public.erp_usuarios(id),
  criado_em timestamptz not null default now(), revisado_em timestamptz, aprovado_em timestamptz, liberado_em timestamptz, data_efetiva timestamptz, proxima_revisao date, unique(documento_id,revisao)
);
create table if not exists public.erp_documentos_qualidade_solicitacoes (
  id uuid primary key default gen_random_uuid(), documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade, empresa_id uuid not null,
  solicitante_id uuid not null references public.erp_usuarios(id), setor_solicitante_id uuid references public.erp_setores(id), motivo text not null,
  prioridade text not null default 'normal' check (prioridade in ('baixa','normal','alta','critica')), status text not null default 'aberta' check (status in ('aberta','em_revisao','aprovada','rejeitada','cancelada','concluida')), criada_em timestamptz not null default now(), concluida_em timestamptz
);
create table if not exists public.erp_documentos_qualidade_ciencia (
  id uuid primary key default gen_random_uuid(), documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade, revisao_id uuid not null references public.erp_documentos_qualidade_revisoes(id) on delete cascade,
  empresa_id uuid not null, usuario_id uuid not null references public.erp_usuarios(id), reconhecido_em timestamptz not null default now(), unique(revisao_id,usuario_id)
);
create table if not exists public.erp_documentos_qualidade_aprovacoes (
  id uuid primary key default gen_random_uuid(), documento_id uuid not null references public.erp_documentos_qualidade(id) on delete cascade, revisao_id uuid not null references public.erp_documentos_qualidade_revisoes(id) on delete cascade,
  empresa_id uuid not null, aprovador_id uuid not null references public.erp_usuarios(id), etapa text not null check (etapa in ('revisao','aprovacao','liberacao')), decisao text not null check (decisao in ('aprovado','rejeitado','devolvido')), comentario text, decidido_em timestamptz not null default now()
);
create table if not exists public.erp_permissoes_modulos (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null, usuario_id uuid references public.erp_usuarios(id) on delete cascade, setor_id uuid references public.erp_setores(id) on delete cascade,
  modulo text not null, visualizar boolean not null default false, criar boolean not null default false, editar boolean not null default false, excluir boolean not null default false, solicitar_alteracao boolean not null default false, revisar boolean not null default false, aprovar boolean not null default false, liberar boolean not null default false, bloquear boolean not null default false,
  unique(empresa_id,usuario_id,setor_id,modulo)
);
alter table public.erp_documentos_qualidade add column if not exists revisao_atual_id uuid references public.erp_documentos_qualidade_revisoes(id);
alter table public.erp_documentos_qualidade add column if not exists preparado_por uuid references public.erp_usuarios(id);
alter table public.erp_documentos_qualidade add column if not exists revisado_por uuid references public.erp_usuarios(id);
alter table public.erp_documentos_qualidade add column if not exists data_revisao timestamptz;
alter table public.erp_documentos_qualidade add column if not exists motivo_alteracao text;
alter table public.erp_documentos_qualidade add column if not exists distribuicao_controlada boolean not null default true;
create index if not exists idx_erp_docq_rev_empresa_doc on public.erp_documentos_qualidade_revisoes(empresa_id,documento_id,revisao desc);
create index if not exists idx_erp_docq_req_empresa_status on public.erp_documentos_qualidade_solicitacoes(empresa_id,status,criada_em desc);
create index if not exists idx_erp_docq_ciencia_empresa on public.erp_documentos_qualidade_ciencia(empresa_id,reconhecido_em desc);
create index if not exists idx_erp_docq_aprov_empresa on public.erp_documentos_qualidade_aprovacoes(empresa_id,decidido_em desc);
create index if not exists idx_erp_perm_mod_empresa_mod on public.erp_permissoes_modulos(empresa_id,modulo);
alter table public.erp_documentos_qualidade_revisoes enable row level security;
alter table public.erp_documentos_qualidade_solicitacoes enable row level security;
alter table public.erp_documentos_qualidade_ciencia enable row level security;
alter table public.erp_documentos_qualidade_aprovacoes enable row level security;
alter table public.erp_permissoes_modulos enable row level security;
create or replace function public.erp_qms_current_user() returns table(usuario_id uuid,empresa_id uuid,setor_id uuid,nivel_admin integer) language sql stable security definer set search_path=pg_catalog,public as $$ select u.id,u.empresa_id,u.setor_id,u.nivel_admin from public.erp_usuarios u where u.auth_user_id=auth.uid() and u.ativo=true limit 1 $$;
create or replace function public.erp_qms_can(p_modulo text,p_acao text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$ select exists(select 1 from public.erp_qms_current_user() cu left join public.erp_permissoes_modulos pm on pm.empresa_id=cu.empresa_id and (pm.usuario_id=cu.usuario_id or (pm.usuario_id is null and pm.setor_id=cu.setor_id)) and pm.modulo=p_modulo where case p_acao when 'visualizar' then coalesce(pm.visualizar,false) when 'criar' then coalesce(pm.criar,false) when 'editar' then coalesce(pm.editar,false) when 'excluir' then coalesce(pm.excluir,false) when 'solicitar_alteracao' then coalesce(pm.solicitar_alteracao,false) when 'revisar' then coalesce(pm.revisar,false) when 'aprovar' then coalesce(pm.aprovar,false) when 'liberar' then coalesce(pm.liberar,false) when 'bloquear' then coalesce(pm.bloquear,false) else false end) or exists(select 1 from public.erp_qms_current_user() cu where cu.nivel_admin>=9 and p_acao in ('visualizar','criar','editar','solicitar_alteracao','revisar','aprovar','liberar','bloquear')) $$;
create policy qms_rev_select on public.erp_documentos_qualidade_revisoes for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','visualizar'));
create policy qms_rev_insert on public.erp_documentos_qualidade_revisoes for insert to authenticated with check (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','criar'));
create policy qms_rev_update on public.erp_documentos_qualidade_revisoes for update to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','editar')) with check (empresa_id=(select empresa_id from public.erp_qms_current_user()));
create policy qms_req_select on public.erp_documentos_qualidade_solicitacoes for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','visualizar'));
create policy qms_req_insert on public.erp_documentos_qualidade_solicitacoes for insert to authenticated with check (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','solicitar_alteracao'));
create policy qms_req_update on public.erp_documentos_qualidade_solicitacoes for update to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and (solicitante_id=(select usuario_id from public.erp_qms_current_user()) or public.erp_qms_can('qualidade_documentos','revisar'))) with check (empresa_id=(select empresa_id from public.erp_qms_current_user()));
create policy qms_ciencia_select on public.erp_documentos_qualidade_ciencia for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','visualizar'));
create policy qms_ciencia_insert on public.erp_documentos_qualidade_ciencia for insert to authenticated with check (empresa_id=(select empresa_id from public.erp_qms_current_user()) and usuario_id=(select usuario_id from public.erp_qms_current_user()));
create policy qms_aprov_select on public.erp_documentos_qualidade_aprovacoes for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','visualizar'));
create policy qms_aprov_insert on public.erp_documentos_qualidade_aprovacoes for insert to authenticated with check (empresa_id=(select empresa_id from public.erp_qms_current_user()) and public.erp_qms_can('qualidade_documentos','aprovar'));
create policy qms_perm_select on public.erp_permissoes_modulos for select to authenticated using (empresa_id=(select empresa_id from public.erp_qms_current_user()) and (usuario_id=(select usuario_id from public.erp_qms_current_user()) or (select nivel_admin from public.erp_qms_current_user())>=9));