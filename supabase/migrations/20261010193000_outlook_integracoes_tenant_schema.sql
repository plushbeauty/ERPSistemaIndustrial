-- Outlook / Microsoft Graph configuration schema.
-- Tenant-scoped metadata only: OAuth tokens/secrets must remain in a backend secret store.
begin;

create table if not exists public.outlook_integracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  mailbox text not null default '',
  microsoft_email text,
  tenant_microsoft_id text,
  status text not null default 'NAO_CONECTADO'
    check (status in ('NAO_CONECTADO','CONECTANDO','CONECTADO','ERRO','DESATIVADO')),
  ativo boolean not null default false,
  ultima_sincronizacao timestamptz,
  ultimo_erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outlook_integracoes_empresa_id_id_key unique (empresa_id,id)
);

create table if not exists public.outlook_regras_pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  integracao_id uuid not null,
  receber_automaticamente boolean not null default false,
  exigir_conferencia boolean not null default true,
  palavras_chave text[] not null default '{}',
  assuntos text[] not null default '{}',
  remetentes_permitidos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outlook_regras_empresa_integracao_fk
    foreign key (empresa_id, integracao_id)
    references public.outlook_integracoes(empresa_id,id) on delete cascade
);

create index if not exists outlook_integracoes_empresa_created_idx
  on public.outlook_integracoes (empresa_id,created_at);
create index if not exists outlook_regras_empresa_created_idx
  on public.outlook_regras_pedidos (empresa_id,created_at);

alter table public.outlook_integracoes enable row level security;
alter table public.outlook_regras_pedidos enable row level security;

drop policy if exists outlook_integracoes_tenant_select on public.outlook_integracoes;
create policy outlook_integracoes_tenant_select on public.outlook_integracoes
  for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists outlook_integracoes_tenant_insert on public.outlook_integracoes;
create policy outlook_integracoes_tenant_insert on public.outlook_integracoes
  for insert to authenticated with check (empresa_id = public.erp_current_empresa_id());
drop policy if exists outlook_integracoes_tenant_update on public.outlook_integracoes;
create policy outlook_integracoes_tenant_update on public.outlook_integracoes
  for update to authenticated using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());
drop policy if exists outlook_integracoes_tenant_delete on public.outlook_integracoes;
create policy outlook_integracoes_tenant_delete on public.outlook_integracoes
  for delete to authenticated using (empresa_id = public.erp_current_empresa_id());

drop policy if exists outlook_regras_tenant_select on public.outlook_regras_pedidos;
create policy outlook_regras_tenant_select on public.outlook_regras_pedidos
  for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists outlook_regras_tenant_insert on public.outlook_regras_pedidos;
create policy outlook_regras_tenant_insert on public.outlook_regras_pedidos
  for insert to authenticated with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (select 1 from public.outlook_integracoes i
      where i.id = integracao_id and i.empresa_id = outlook_regras_pedidos.empresa_id)
  );
drop policy if exists outlook_regras_tenant_update on public.outlook_regras_pedidos;
create policy outlook_regras_tenant_update on public.outlook_regras_pedidos
  for update to authenticated using (empresa_id = public.erp_current_empresa_id())
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (select 1 from public.outlook_integracoes i
      where i.id = integracao_id and i.empresa_id = outlook_regras_pedidos.empresa_id)
  );
drop policy if exists outlook_regras_tenant_delete on public.outlook_regras_pedidos;
create policy outlook_regras_tenant_delete on public.outlook_regras_pedidos
  for delete to authenticated using (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete on public.outlook_integracoes, public.outlook_regras_pedidos to authenticated;
notify pgrst, 'reload schema';

commit;
