begin;

create table if not exists public.erp_clientes_dn_config (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid not null references public.erp_clientes(id) on delete cascade,
  email_cobranca text,
  condicao_pagamento_padrao text,
  exigir_pod boolean not null default false,
  limite_credito numeric(18,2) not null default 0 check (limite_credito >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, cliente_id)
);

create table if not exists public.erp_notas_debito_clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid not null references public.erp_clientes(id) on delete restrict,
  numero_dn text not null,
  valor_nominal numeric(18,2) not null check (valor_nominal >= 0),
  data_emissao date not null default current_date,
  descricao text,
  status text not null default 'ABERTA' check (status in ('ABERTA','AGUARDANDO_POD','LIBERADA','CANCELADA')),
  pod_bucket text,
  pod_path text,
  pod_data_entrega date,
  pod_recebedor text,
  pod_validado_em timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero_dn)
);

create index if not exists ix_erp_clientes_dn_config_cliente on public.erp_clientes_dn_config(empresa_id,cliente_id);
create index if not exists ix_erp_notas_debito_cliente_data on public.erp_notas_debito_clientes(empresa_id,data_emissao desc);
create index if not exists ix_erp_notas_debito_cliente_numero on public.erp_notas_debito_clientes(empresa_id,numero_dn);

alter table public.erp_clientes_dn_config enable row level security;
alter table public.erp_notas_debito_clientes enable row level security;

drop policy if exists erp_clientes_dn_config_tenant on public.erp_clientes_dn_config;
create policy erp_clientes_dn_config_tenant on public.erp_clientes_dn_config
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_notas_debito_clientes_tenant on public.erp_notas_debito_clientes;
create policy erp_notas_debito_clientes_tenant on public.erp_notas_debito_clientes
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update on public.erp_clientes_dn_config to authenticated;
grant select, insert, update on public.erp_notas_debito_clientes to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('erp-clientes-pod', 'erp-clientes-pod', false, 5242880, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update set public=false, file_size_limit=5242880, allowed_mime_types=array['application/pdf','image/png','image/jpeg'];

drop policy if exists erp_clientes_pod_select_tenant on storage.objects;
create policy erp_clientes_pod_select_tenant on storage.objects
for select to authenticated
using (bucket_id='erp-clientes-pod' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_clientes_pod_insert_tenant on storage.objects;
create policy erp_clientes_pod_insert_tenant on storage.objects
for insert to authenticated
with check (bucket_id='erp-clientes-pod' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists erp_clientes_pod_update_tenant on storage.objects;
create policy erp_clientes_pod_update_tenant on storage.objects
for update to authenticated
using (bucket_id='erp-clientes-pod' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text)
with check (bucket_id='erp-clientes-pod' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

commit;
