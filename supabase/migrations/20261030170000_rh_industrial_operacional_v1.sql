-- SYSNQRA ERP INDUSTRIAL — RH operacional REV-RH-20261030
begin;

alter table if exists public.erp_funcionarios
  add column if not exists nome_completo text,
  add column if not exists nome text,
  add column if not exists data_nascimento date,
  add column if not exists rg text,
  add column if not exists celular text,
  add column if not exists telefone text,
  add column if not exists email text,
  add column if not exists data_admissao date,
  add column if not exists cargo text,
  add column if not exists departamento text,
  add column if not exists regime_trabalho text,
  add column if not exists turno_trabalho text,
  add column if not exists numero_cracha_rfid text,
  add column if not exists salario_nominal numeric(14,2),
  add column if not exists custo_hora_homem numeric(14,4),
  add column if not exists status text default 'Ativo',
  add column if not exists status_colaborador text default 'Ativo',
  add column if not exists foto_path text,
  add column if not exists atualizado_em timestamptz not null default now();

create table if not exists public.erp_rh_ponto_eventos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete restrict,
  tipo text not null check (tipo in ('ENTRADA','SAIDA_INTERVALO','RETORNO_INTERVALO','SAIDA')),
  registrado_em timestamptz not null default now(),
  origem text not null default 'MANUAL' check (origem in ('MANUAL','RELOGIO','CATRACA','IMPORTACAO')),
  observacao text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.erp_rh_faltas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete restrict,
  data_inicio date not null,
  data_fim date,
  tipo text not null default 'FALTA',
  justificativa text,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','JUSTIFICADA','INJUSTIFICADA','CANCELADA')),
  anexo_path text,
  observacoes text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  check (data_fim is null or data_fim >= data_inicio)
);

create table if not exists public.erp_rh_treinamentos_registros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete restrict,
  titulo text not null,
  instrutor text,
  data_treinamento date not null,
  carga_horas numeric(8,2) not null default 0 check (carga_horas >= 0),
  resultado text,
  status text not null default 'PENDENTE' check (status in ('PENDENTE','CONCLUIDO','REPROVADO','VENCIDO')),
  validade_ate date,
  certificado_path text,
  observacoes text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.erp_rh_ferias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete restrict,
  periodo_aquisitivo_inicio date not null,
  periodo_aquisitivo_fim date not null,
  inicio date not null,
  fim date not null,
  dias integer not null check (dias > 0),
  status text not null default 'PROGRAMADA' check (status in ('PROGRAMADA','GOZADA','CANCELADA')),
  observacoes text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  check (fim >= inicio),
  check (periodo_aquisitivo_fim >= periodo_aquisitivo_inicio)
);

create index if not exists idx_erp_rh_ponto_empresa_func_data on public.erp_rh_ponto_eventos(empresa_id, funcionario_id, registrado_em desc);
create index if not exists idx_erp_rh_faltas_empresa_data on public.erp_rh_faltas(empresa_id, data_inicio desc);
create index if not exists idx_erp_rh_treinamentos_empresa_data on public.erp_rh_treinamentos_registros(empresa_id, data_treinamento desc);
create index if not exists idx_erp_rh_ferias_empresa_inicio on public.erp_rh_ferias(empresa_id, inicio);

do $$
declare
  t text;
begin
  foreach t in array array['erp_rh_ponto_eventos','erp_rh_faltas','erp_rh_treinamentos_registros','erp_rh_ferias']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_guard', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id())) with check ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()))', t || '_tenant_guard', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

alter table if exists public.erp_funcionarios enable row level security;
revoke all on table public.erp_funcionarios from anon;
grant select, insert, update, delete on table public.erp_funcionarios to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rh-arquivos', 'rh-arquivos', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists rh_arquivos_select_tenant on storage.objects;
drop policy if exists rh_arquivos_insert_tenant on storage.objects;
drop policy if exists rh_arquivos_update_tenant on storage.objects;
drop policy if exists rh_arquivos_delete_tenant on storage.objects;

create policy rh_arquivos_select_tenant on storage.objects for select to authenticated
using (bucket_id = 'rh-arquivos' and ((storage.foldername(name))[1] = (select public.erp_current_empresa_id())::text or (select public.erp_is_master())));
create policy rh_arquivos_insert_tenant on storage.objects for insert to authenticated
with check (bucket_id = 'rh-arquivos' and ((storage.foldername(name))[1] = (select public.erp_current_empresa_id())::text or (select public.erp_is_master())));
create policy rh_arquivos_update_tenant on storage.objects for update to authenticated
using (bucket_id = 'rh-arquivos' and ((storage.foldername(name))[1] = (select public.erp_current_empresa_id())::text or (select public.erp_is_master())))
with check (bucket_id = 'rh-arquivos' and ((storage.foldername(name))[1] = (select public.erp_current_empresa_id())::text or (select public.erp_is_master())));
create policy rh_arquivos_delete_tenant on storage.objects for delete to authenticated
using (bucket_id = 'rh-arquivos' and ((storage.foldername(name))[1] = (select public.erp_current_empresa_id())::text or (select public.erp_is_master())));

commit;
