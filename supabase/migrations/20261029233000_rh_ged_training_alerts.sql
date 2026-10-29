-- SYSNQRA ERP INDUSTRIAL — RH: GED privado e treinamentos regulamentares
-- Aditiva; não substitui tabelas existentes. Aplicar e validar no Supabase antes de liberar o módulo.
begin;

alter table public.erp_funcionarios add column if not exists foto_url text;
alter table public.erp_funcionarios add column if not exists dados_pessoais jsonb not null default '{}'::jsonb;

create unique index if not exists uq_erp_funcionarios_empresa_id_id on public.erp_funcionarios (empresa_id, id);

create table if not exists public.rh_treinamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete cascade,
  nome_treinamento varchar(150) not null,
  data_realizacao date not null,
  data_validade date,
  instrutor varchar(100),
  status varchar(30) not null default 'VALIDO' check (status in ('VALIDO','VENCIDO','RECICLAGEM')),
  created_at timestamptz not null default now(),
  constraint rh_treinamentos_empresa_funcionario_fk foreign key (empresa_id, funcionario_id)
    references public.erp_funcionarios(empresa_id, id) deferrable initially immediate
);

create table if not exists public.rh_documentos_colaborador (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete cascade,
  nome_documento varchar(255) not null,
  path_storage text not null unique check (path_storage like ('rh/funcionarios/' || funcionario_id::text || '/%')),
  created_at timestamptz not null default now(),
  constraint rh_documentos_empresa_funcionario_fk foreign key (empresa_id, funcionario_id)
    references public.erp_funcionarios(empresa_id, id) deferrable initially immediate
);

create unique index if not exists uq_rh_treinamentos_id_empresa on public.rh_treinamentos (id, empresa_id);
create index if not exists idx_rh_treinamentos_empresa_validade on public.rh_treinamentos (empresa_id, data_validade);
create index if not exists idx_rh_documentos_empresa_funcionario on public.rh_documentos_colaborador (empresa_id, funcionario_id, created_at desc);

alter table public.rh_treinamentos enable row level security;
alter table public.rh_documentos_colaborador enable row level security;
drop policy if exists rh_treinamentos_tenant_select on public.rh_treinamentos;
drop policy if exists rh_treinamentos_tenant_insert on public.rh_treinamentos;
drop policy if exists rh_treinamentos_tenant_update on public.rh_treinamentos;
drop policy if exists rh_treinamentos_tenant_delete on public.rh_treinamentos;
create policy rh_treinamentos_tenant_select on public.rh_treinamentos for select to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());
create policy rh_treinamentos_tenant_insert on public.rh_treinamentos for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() and exists (
    select 1 from public.erp_funcionarios f where f.id = funcionario_id and f.empresa_id = rh_treinamentos.empresa_id));
create policy rh_treinamentos_tenant_update on public.rh_treinamentos for update to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id() and exists (
    select 1 from public.erp_funcionarios f where f.id = funcionario_id and f.empresa_id = rh_treinamentos.empresa_id));
create policy rh_treinamentos_tenant_delete on public.rh_treinamentos for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists rh_documentos_tenant_select on public.rh_documentos_colaborador;
drop policy if exists rh_documentos_tenant_insert on public.rh_documentos_colaborador;
drop policy if exists rh_documentos_tenant_update on public.rh_documentos_colaborador;
drop policy if exists rh_documentos_tenant_delete on public.rh_documentos_colaborador;
create policy rh_documentos_tenant_select on public.rh_documentos_colaborador for select to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());
create policy rh_documentos_tenant_insert on public.rh_documentos_colaborador for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id()
    and path_storage like ('rh/funcionarios/' || funcionario_id::text || '/%')
    and exists (select 1 from public.erp_funcionarios f where f.id = funcionario_id and f.empresa_id = rh_documentos_colaborador.empresa_id));
create policy rh_documentos_tenant_update on public.rh_documentos_colaborador for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id() and exists (
    select 1 from public.erp_funcionarios f where f.id = funcionario_id and f.empresa_id = rh_documentos_colaborador.empresa_id));
create policy rh_documentos_tenant_delete on public.rh_documentos_colaborador for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete on public.rh_treinamentos, public.rh_documentos_colaborador to authenticated;

-- Bucket privado para documentos pessoais e certificados. Nenhuma URL pública é criada.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rh-privado', 'rh-privado', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png'];

drop policy if exists rh_private_storage_select on storage.objects;
drop policy if exists rh_private_storage_insert on storage.objects;
drop policy if exists rh_private_storage_update on storage.objects;
drop policy if exists rh_private_storage_delete on storage.objects;
create policy rh_private_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'rh-privado' and exists (
    select 1 from public.erp_funcionarios f
    where f.id::text = (storage.foldername(name))[3]
      and f.empresa_id = public.erp_current_empresa_id()));
create policy rh_private_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'rh-privado' and exists (
    select 1 from public.erp_funcionarios f
    where f.id::text = (storage.foldername(name))[3]
      and f.empresa_id = public.erp_current_empresa_id()));
create policy rh_private_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'rh-privado' and exists (
    select 1 from public.erp_funcionarios f
    where f.id::text = (storage.foldername(name))[3]
      and f.empresa_id = public.erp_current_empresa_id()))
  with check (bucket_id = 'rh-privado' and exists (
    select 1 from public.erp_funcionarios f
    where f.id::text = (storage.foldername(name))[3]
      and f.empresa_id = public.erp_current_empresa_id()));
create policy rh_private_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'rh-privado' and exists (
    select 1 from public.erp_funcionarios f
    where f.id::text = (storage.foldername(name))[3]
      and f.empresa_id = public.erp_current_empresa_id()));

create or replace view public.vw_treinamentos_criticos_30_dias
with (security_invoker = true) as
select rt.id as treinamento_id, rt.empresa_id, rt.nome_treinamento, rt.data_validade,
       ef.nome as funcionario_nome, ef.cargo as funcionario_cargo, ef.departamento as setor_industrial
from public.rh_treinamentos rt
join public.erp_funcionarios ef on ef.id = rt.funcionario_id and ef.empresa_id = rt.empresa_id
where rt.status = 'VALIDO' and rt.data_validade = current_date + 30;

create table if not exists public.log_alertas_treinamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  treinamento_id uuid not null,
  tipo_alerta varchar(20) not null default '30_DIAS',
  data_validade date not null,
  enviado_em timestamptz not null default now(),
  constraint uq_log_alerta_treinamento unique (empresa_id, treinamento_id, tipo_alerta, data_validade)
);
alter table public.log_alertas_treinamentos enable row level security;
drop policy if exists log_alertas_treinamentos_tenant_select on public.log_alertas_treinamentos;
create policy log_alertas_treinamentos_tenant_select on public.log_alertas_treinamentos for select to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());
grant select on public.log_alertas_treinamentos to authenticated;
grant all on public.rh_treinamentos, public.rh_documentos_colaborador, public.log_alertas_treinamentos to service_role;

commit;
