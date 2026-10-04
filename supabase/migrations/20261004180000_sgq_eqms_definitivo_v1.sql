-- SGQ/eQMS definitivo: documentos, distribuição controlada, RPNC/CAPA e auditoria.
create table if not exists public.erp_qualidade_documentos_editor (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 codigo_documento text not null,
 titulo_documento text not null,
 revisao integer not null default 0,
 data_homologacao date,
 conteudo_texto text not null default '',
 setor_responsavel text not null default 'QUALIDADE',
 status text not null default 'VIGENTE',
 motivo_alteracao text,
 atualizado_em timestamptz not null default now(),
 unique(empresa_id,codigo_documento)
);
create table if not exists public.erp_qualidade_documentos_revisoes (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 codigo_documento text not null,
 titulo_documento text not null,
 departamento text not null default 'QUALIDADE',
 revisao integer not null,
 responsavel text,
 status text not null default 'VIGENTE',
 conteudo_texto text not null default '',
 motivo_alteracao text,
 criado_em timestamptz not null default now(),
 unique(empresa_id,codigo_documento,revisao)
);
alter table public.erp_rpnc
  add column if not exists origem text,
  add column if not exists gravidade text,
  add column if not exists setor_envolvido_id uuid references public.erp_setores(id),
  add column if not exists causa_raiz text,
  add column if not exists investigacao text,
  add column if not exists eficacia text,
  add column if not exists data_eficacia date,
  add column if not exists procedimento_id uuid references public.erp_documentos_qualidade(id);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='erp_rpnc_gravidade_check') then
  alter table public.erp_rpnc add constraint erp_rpnc_gravidade_check check(gravidade is null or gravidade in ('critica','maior','menor'));
 end if;
end $$;
create table if not exists public.erp_qms_documento_distribuicoes (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 revisao_id uuid not null references public.erp_qualidade_documentos_revisoes(id) on delete cascade,
 setor_id uuid not null references public.erp_setores(id) on delete restrict,
 obrigatoria boolean not null default true,
 distribuida_em timestamptz not null default now(),
 prazo_leitura date,
 lida_em timestamptz,
 reconhecida_por uuid references public.erp_usuarios(id),
 status text not null default 'pendente' check(status in ('pendente','lida','atrasada','cancelada')),
 unique(revisao_id,setor_id)
);
create table if not exists public.erp_qms_auditoria (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 entidade text not null,
 entidade_id uuid not null,
 evento text not null,
 ator_id uuid references public.erp_usuarios(id),
 antes jsonb,
 depois jsonb,
 motivo text,
 criado_em timestamptz not null default now()
);
create index if not exists idx_qms_dist_empresa_status on public.erp_qms_documento_distribuicoes(empresa_id,status,prazo_leitura);
create index if not exists idx_qms_audit_entity on public.erp_qms_auditoria(empresa_id,entidade,entidade_id,criado_em desc);
create index if not exists idx_rpnc_qms_empresa_gravidade on public.erp_rpnc(empresa_id,gravidade,status,setor_envolvido_id);
alter table public.erp_qualidade_documentos_editor enable row level security;
alter table public.erp_qualidade_documentos_revisoes enable row level security;
alter table public.erp_qms_documento_distribuicoes enable row level security;
alter table public.erp_qms_auditoria enable row level security;
drop policy if exists qms_editor_select on public.erp_qualidade_documentos_editor;
drop policy if exists qms_rev_select on public.erp_qualidade_documentos_revisoes;
drop policy if exists qms_dist_select on public.erp_qms_documento_distribuicoes;
drop policy if exists qms_dist_insert on public.erp_qms_documento_distribuicoes;
drop policy if exists qms_dist_update on public.erp_qms_documento_distribuicoes;
drop policy if exists qms_audit_select on public.erp_qms_auditoria;
create policy qms_editor_select on public.erp_qualidade_documentos_editor for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy qms_rev_select on public.erp_qualidade_documentos_revisoes for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy qms_dist_select on public.erp_qms_documento_distribuicoes for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy qms_dist_insert on public.erp_qms_documento_distribuicoes for insert to authenticated with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy qms_dist_update on public.erp_qms_documento_distribuicoes for update to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy qms_audit_select on public.erp_qms_auditoria for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select on public.erp_qualidade_documentos_editor,public.erp_qualidade_documentos_revisoes,public.erp_qms_documento_distribuicoes,public.erp_qms_auditoria to authenticated;
create or replace function public.erp_qms_salvar_revisao(p_codigo text,p_titulo text,p_departamento text,p_conteudo text,p_motivo text,p_setor_responsavel text default 'QUALIDADE')
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_empresa uuid:=public.erp_current_empresa_id();v_old integer;v_new integer;v_revision_id uuid;v_user uuid;
begin
 if v_empresa is null then raise exception 'Empresa da sessão não identificada'; end if;
 if trim(coalesce(p_codigo,''))='' or trim(coalesce(p_titulo,''))='' then raise exception 'Código e título são obrigatórios'; end if;
 if length(trim(coalesce(p_motivo,'')))<5 then raise exception 'Motivo da alteração é obrigatório'; end if;
 select revisao into v_old from public.erp_qualidade_documentos_editor where empresa_id=v_empresa and codigo_documento=trim(p_codigo) for update;
 v_new:=coalesce(v_old,0)+1;
 select id into v_user from public.erp_usuarios where auth_user_id=auth.uid() and empresa_id=v_empresa and ativo=true limit 1;
 update public.erp_qualidade_documentos_revisoes set status='OBSOLETO' where empresa_id=v_empresa and codigo_documento=trim(p_codigo) and status='VIGENTE';
 insert into public.erp_qualidade_documentos_revisoes(empresa_id,codigo_documento,titulo_documento,departamento,revisao,responsavel,status,conteudo_texto,motivo_alteracao)
 values(v_empresa,trim(p_codigo),trim(p_titulo),coalesce(nullif(trim(p_departamento),''),'QUALIDADE'),v_new,coalesce((select coalesce(nome,email) from public.erp_usuarios where id=v_user limit 1),'USUARIO'),'VIGENTE',coalesce(p_conteudo,''),trim(p_motivo))
 returning id into v_revision_id;
 insert into public.erp_qualidade_documentos_editor(empresa_id,codigo_documento,titulo_documento,revisao,data_homologacao,conteudo_texto,setor_responsavel,status,motivo_alteracao,atualizado_em)
 values(v_empresa,trim(p_codigo),trim(p_titulo),v_new,current_date,coalesce(p_conteudo,''),coalesce(nullif(trim(p_setor_responsavel),''),'QUALIDADE'),'VIGENTE',trim(p_motivo),now())
 on conflict(empresa_id,codigo_documento) do update set titulo_documento=excluded.titulo_documento,revisao=excluded.revisao,data_homologacao=excluded.data_homologacao,conteudo_texto=excluded.conteudo_texto,setor_responsavel=excluded.setor_responsavel,status='VIGENTE',motivo_alteracao=excluded.motivo_alteracao,atualizado_em=now();
 insert into public.erp_qms_auditoria(empresa_id,entidade,entidade_id,evento,ator_id,depois,motivo)
 values(v_empresa,'documento_revisao',v_revision_id,'REVISAO_CRIADA',v_user,jsonb_build_object('codigo',p_codigo,'revisao',v_new,'titulo',p_titulo),trim(p_motivo));
 return jsonb_build_object('revision_id',v_revision_id,'revisao',v_new,'codigo',trim(p_codigo));
end $$;
revoke all on function public.erp_qms_salvar_revisao(text,text,text,text,text,text) from public,anon;
grant execute on function public.erp_qms_salvar_revisao(text,text,text,text,text,text) to authenticated;
create or replace function public.erp_qms_distribuir_revisao(p_revisao_id uuid,p_setores uuid[],p_prazo date)
returns integer language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_empresa uuid:=public.erp_current_empresa_id();v_count integer:=0;v_setor uuid;v_nivel integer;
begin
 if v_empresa is null then raise exception 'Empresa da sessão não identificada'; end if;
 select nivel_admin into v_nivel from public.erp_usuarios where auth_user_id=auth.uid() and empresa_id=v_empresa and ativo=true limit 1;
 if not public.erp_is_master() and coalesce(v_nivel,999)>1 and not public.erp_has_permission('qualidade_documentos.liberar') then raise exception 'Sem permissão para distribuir documento'; end if;
 foreach v_setor in array coalesce(p_setores,array[]::uuid[]) loop
  insert into public.erp_qms_documento_distribuicoes(empresa_id,revisao_id,setor_id,prazo_leitura,status) values(v_empresa,p_revisao_id,v_setor,p_prazo,'pendente')
  on conflict(revisao_id,setor_id) do update set prazo_leitura=excluded.prazo_leitura,status='pendente',distribuida_em=now();
  v_count:=v_count+1;
 end loop;
 insert into public.erp_qms_auditoria(empresa_id,entidade,entidade_id,evento,ator_id,depois)
 values(v_empresa,'documento_revisao',p_revisao_id,'DISTRIBUICAO_DISPARADA',(select id from public.erp_usuarios where auth_user_id=auth.uid() and empresa_id=v_empresa limit 1),jsonb_build_object('setores',p_setores,'prazo',p_prazo));
 return v_count;
end $$;
revoke all on function public.erp_qms_distribuir_revisao(uuid,uuid[],date) from public,anon;
grant execute on function public.erp_qms_distribuir_revisao(uuid,uuid[],date) to authenticated;
