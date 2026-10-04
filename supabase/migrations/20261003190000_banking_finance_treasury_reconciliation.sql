create table if not exists public.erp_importacoes_log (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  nome_arquivo varchar(255) not null,
  url_arquivo text not null,
  status_processamento varchar(30) not null default 'Processando' check (status_processamento in ('Processando','Completed','Falhou')),
  numero_transacoes integer not null default 0 check (numero_transacoes >= 0),
  saldo_fechamento numeric(14,2) not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.erp_importacoes_log enable row level security;
drop policy if exists erp_importacoes_log_tenant on public.erp_importacoes_log;
create policy erp_importacoes_log_tenant on public.erp_importacoes_log for all to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());
create index if not exists idx_erp_importacoes_log_empresa_criado on public.erp_importacoes_log(empresa_id, criado_em desc);

create table if not exists public.erp_contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo varchar(50) not null,
  nome varchar(160) not null,
  banco varchar(120) not null,
  agencia varchar(30),
  conta varchar(40),
  moeda varchar(3) not null default 'BRL',
  saldo_inicial numeric(14,2) not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique(empresa_id, codigo)
);
alter table public.erp_contas_bancarias enable row level security;
drop policy if exists erp_contas_bancarias_tenant on public.erp_contas_bancarias;
create policy erp_contas_bancarias_tenant on public.erp_contas_bancarias for all to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());

create table if not exists public.erp_transacoes_bancarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  conta_bancaria_id uuid not null references public.erp_contas_bancarias(id) on delete cascade,
  importacao_id uuid references public.erp_importacoes_log(id) on delete set null,
  data_movimento date not null,
  data_valor date,
  descricao text not null,
  referencia text,
  tipo varchar(10) not null check (tipo in ('CREDITO','DEBITO')),
  valor numeric(14,2) not null check (valor > 0),
  saldo numeric(14,2),
  status varchar(20) not null default 'PENDENTE' check (status in ('PENDENTE','CONCILIADO','IGNORADO')),
  documento_origem text,
  criado_em timestamptz not null default now()
);
alter table public.erp_transacoes_bancarias enable row level security;
drop policy if exists erp_transacoes_bancarias_tenant on public.erp_transacoes_bancarias;
create policy erp_transacoes_bancarias_tenant on public.erp_transacoes_bancarias for all to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());
create index if not exists idx_erp_transacoes_bancarias_filtro on public.erp_transacoes_bancarias(empresa_id, conta_bancaria_id, data_movimento, status);

create table if not exists public.erp_conciliacoes_bancarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  transacao_bancaria_id uuid not null references public.erp_transacoes_bancarias(id) on delete cascade,
  documento_tipo varchar(50),
  documento_id uuid,
  referencia_interna text,
  valor_conciliado numeric(14,2) not null check (valor_conciliado > 0),
  conciliado_em timestamptz not null default now(),
  conciliado_por uuid references auth.users(id)
);
alter table public.erp_conciliacoes_bancarias enable row level security;
drop policy if exists erp_conciliacoes_bancarias_tenant on public.erp_conciliacoes_bancarias;
create policy erp_conciliacoes_bancarias_tenant on public.erp_conciliacoes_bancarias for all to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());
create index if not exists idx_erp_conciliacoes_bancarias_transacao on public.erp_conciliacoes_bancarias(empresa_id, transacao_bancaria_id);

grant select, insert, update, delete on public.erp_importacoes_log, public.erp_contas_bancarias, public.erp_transacoes_bancarias, public.erp_conciliacoes_bancarias to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('banking-extratos','banking-extratos',false,52428800,array['text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists banking_extratos_select on storage.objects;
create policy banking_extratos_select on storage.objects for select to authenticated using(bucket_id='banking-extratos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists banking_extratos_insert on storage.objects;
create policy banking_extratos_insert on storage.objects for insert to authenticated with check(bucket_id='banking-extratos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists banking_extratos_update on storage.objects;
create policy banking_extratos_update on storage.objects for update to authenticated using(bucket_id='banking-extratos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text) with check(bucket_id='banking-extratos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
drop policy if exists banking_extratos_delete on storage.objects;
create policy banking_extratos_delete on storage.objects for delete to authenticated using(bucket_id='banking-extratos' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
