begin;

create table if not exists public.outlook_integracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  mailbox text,
  microsoft_email text,
  tenant_microsoft_id text,
  status text not null default 'desconectada',
  ativo boolean not null default false,
  ultima_sincronizacao timestamptz,
  ultimo_erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outlook_integracoes_status_ck check (status in ('desconectada','pendente','conectada','erro','pausada'))
);

create unique index if not exists outlook_integracoes_empresa_id_id_uq
  on public.outlook_integracoes (empresa_id, id);

create table if not exists public.outlook_regras_pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  integracao_id uuid not null,
  receber_automaticamente boolean not null default false,
  exigir_conferencia boolean not null default true,
  palavras_chave text[] not null default '{}'::text[],
  assuntos text[] not null default '{}'::text[],
  remetentes_permitidos text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outlook_regras_empresa_integracao_fk foreign key (empresa_id, integracao_id)
    references public.outlook_integracoes (empresa_id, id) on delete cascade
);

create index if not exists outlook_integracoes_empresa_status_idx
  on public.outlook_integracoes (empresa_id, status);
create index if not exists outlook_regras_empresa_integracao_idx
  on public.outlook_regras_pedidos (empresa_id, integracao_id);

alter table public.outlook_integracoes enable row level security;
alter table public.outlook_regras_pedidos enable row level security;

drop policy if exists outlook_integracoes_tenant on public.outlook_integracoes;
create policy outlook_integracoes_tenant on public.outlook_integracoes
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists outlook_regras_pedidos_tenant on public.outlook_regras_pedidos;
create policy outlook_regras_pedidos_tenant on public.outlook_regras_pedidos
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete on public.outlook_integracoes, public.outlook_regras_pedidos to authenticated;
revoke all on public.outlook_integracoes, public.outlook_regras_pedidos from anon;

commit;