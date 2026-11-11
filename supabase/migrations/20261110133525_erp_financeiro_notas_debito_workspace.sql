begin;

create table if not exists public.erp_notas_debito_financeiras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero_nota text,
  documento_ref text,
  cliente_id uuid references public.erp_clientes(id) on delete restrict,
  entidade_nome text not null,
  data_emissao date not null,
  data_vencimento date not null,
  tipo_lancamento text not null check (tipo_lancamento in ('A_RECEBER','A_PAGAR')),
  valor_principal numeric(18,2) not null check (valor_principal > 0),
  acrescimos numeric(18,2) not null default 0 check (acrescimos >= 0),
  descontos numeric(18,2) not null default 0 check (descontos >= 0),
  valor_total numeric(18,2) not null check (valor_total >= 0),
  conta_bancaria_id uuid not null references public.erp_contas_bancarias(id),
  centro_custo_id uuid not null references public.erp_centros_custos(id),
  descricao text not null,
  comprovante_path text,
  gerar_titulo boolean not null default false,
  disponibilizar_conciliacao boolean not null default false,
  status text not null default 'ABERTA' check (status in ('ABERTA','TITULO_GERADO','CANCELADA')),
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_notas_debito_financeiras_numero_empresa unique (empresa_id, numero_nota)
);

create table if not exists public.erp_notas_debito_extratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  conta_bancaria_id uuid not null references public.erp_contas_bancarias(id),
  arquivo_nome text not null,
  arquivo_path text not null,
  formato text not null check (formato in ('OFX','TXT','RET','REM')),
  status text not null default 'AGUARDANDO_CONFERENCIA',
  created_at timestamptz not null default now()
);

create index if not exists ix_erp_notas_debito_fin_empresa_data on public.erp_notas_debito_financeiras(empresa_id, data_emissao desc);
create index if not exists ix_erp_notas_debito_fin_empresa_venc on public.erp_notas_debito_financeiras(empresa_id, data_vencimento);
create index if not exists ix_erp_notas_debito_extratos_empresa_data on public.erp_notas_debito_extratos(empresa_id, created_at desc);

alter table public.erp_notas_debito_financeiras enable row level security;
alter table public.erp_notas_debito_extratos enable row level security;

drop policy if exists erp_notas_debito_financeiras_tenant on public.erp_notas_debito_financeiras;
create policy erp_notas_debito_financeiras_tenant on public.erp_notas_debito_financeiras
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (
  empresa_id = public.erp_current_empresa_id()
  and exists (select 1 from public.erp_contas_bancarias c where c.id = conta_bancaria_id and c.empresa_id = public.erp_current_empresa_id())
  and exists (select 1 from public.erp_centros_custos cc where cc.id = centro_custo_id and cc.empresa_id = public.erp_current_empresa_id())
  and (cliente_id is null or exists (select 1 from public.erp_clientes cl where cl.id = cliente_id and cl.empresa_id = public.erp_current_empresa_id()))
);

drop policy if exists erp_notas_debito_extratos_tenant on public.erp_notas_debito_extratos;
create policy erp_notas_debito_extratos_tenant on public.erp_notas_debito_extratos
for all to authenticated
using (empresa_id = public.erp_current_empresa_id())
with check (
  empresa_id = public.erp_current_empresa_id()
  and exists (select 1 from public.erp_contas_bancarias c where c.id = conta_bancaria_id and c.empresa_id = public.erp_current_empresa_id())
);

grant select, insert, update on public.erp_notas_debito_financeiras to authenticated;
grant select, insert, update on public.erp_notas_debito_extratos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('financeiro-comprovantes','financeiro-comprovantes',false,10485760,array['application/pdf','image/png','image/jpeg','application/x-ofx','text/plain'])
on conflict (id) do update set public=false, file_size_limit=10485760, allowed_mime_types=array['application/pdf','image/png','image/jpeg','application/x-ofx','text/plain'];

drop policy if exists financeiro_comprovantes_select_tenant on storage.objects;
create policy financeiro_comprovantes_select_tenant on storage.objects
for select to authenticated
using (bucket_id='financeiro-comprovantes' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists financeiro_comprovantes_insert_tenant on storage.objects;
create policy financeiro_comprovantes_insert_tenant on storage.objects
for insert to authenticated
with check (bucket_id='financeiro-comprovantes' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

drop policy if exists financeiro_comprovantes_update_tenant on storage.objects;
create policy financeiro_comprovantes_update_tenant on storage.objects
for update to authenticated
using (bucket_id='financeiro-comprovantes' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text)
with check (bucket_id='financeiro-comprovantes' and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text);

commit;