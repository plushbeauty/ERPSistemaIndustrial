/*
  VENDAS — auditoria da origem e anexos do pedido
  Guarda a origem do pedido e o vínculo seguro de arquivos recebidos por e-mail.
*/
alter table public.erp_pedidos_venda
  add column if not exists entrada_via text;

alter table public.erp_pedidos_venda
  drop constraint if exists erp_pedidos_venda_entrada_via_check;

alter table public.erp_pedidos_venda
  add constraint erp_pedidos_venda_entrada_via_check
  check (entrada_via is null or entrada_via in ('EMAIL','WHATSAPP','TELEFONE'));

create table if not exists public.erp_pedido_anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  pedido_id uuid not null references public.erp_pedidos_venda(id) on delete cascade,
  nome_arquivo text not null,
  caminho_storage text not null unique,
  mime_type text,
  tamanho_bytes bigint not null check (tamanho_bytes >= 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  origem text not null default 'EMAIL' check (origem in ('EMAIL')),
  created_by uuid references public.erp_usuarios(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_pedido_anexos_empresa_pedido
  on public.erp_pedido_anexos(empresa_id,pedido_id,created_at desc);

alter table public.erp_pedido_anexos enable row level security;

drop policy if exists "erp_pedido_anexos_select_empresa" on public.erp_pedido_anexos;
create policy "erp_pedido_anexos_select_empresa"
  on public.erp_pedido_anexos
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists "erp_pedido_anexos_insert_empresa" on public.erp_pedido_anexos;
create policy "erp_pedido_anexos_insert_empresa"
  on public.erp_pedido_anexos
  for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_pedidos_venda p
      where p.id = pedido_id and p.empresa_id = empresa_id
    )
  );

drop policy if exists "erp_pedido_anexos_delete_empresa" on public.erp_pedido_anexos;
create policy "erp_pedido_anexos_delete_empresa"
  on public.erp_pedido_anexos
  for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id());

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'erp-pedidos-anexos',
  'erp-pedidos-anexos',
  false,
  20971520,
  array['message/rfc822','application/vnd.ms-outlook','application/octet-stream']
)
on conflict (id) do update
set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "erp_pedidos_anexos_storage_select" on storage.objects;
create policy "erp_pedidos_anexos_storage_select"
  on storage.objects for select to authenticated
  using (
    bucket_id='erp-pedidos-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );

drop policy if exists "erp_pedidos_anexos_storage_insert" on storage.objects;
create policy "erp_pedidos_anexos_storage_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id='erp-pedidos-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );

drop policy if exists "erp_pedidos_anexos_storage_delete" on storage.objects;
create policy "erp_pedidos_anexos_storage_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id='erp-pedidos-anexos'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
  );
