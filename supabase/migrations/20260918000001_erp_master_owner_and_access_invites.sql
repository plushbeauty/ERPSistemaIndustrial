create table if not exists public.erp_convites_acesso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  email text not null,
  nome text not null,
  role_id uuid null references public.erp_roles(id),
  role text not null default 'USER',
  nivel_admin integer not null default 1,
  auth_user_id uuid null references auth.users(id) on delete set null,
  criado_por uuid null references public.erp_usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '15 minutes'),
  verificado_em timestamptz null,
  concluido_em timestamptz null,
  cancelado_em timestamptz null
);

alter table public.erp_convites_acesso enable row level security;
create index if not exists erp_convites_acesso_empresa_idx on public.erp_convites_acesso(empresa_id, criado_em desc);
create index if not exists erp_convites_acesso_auth_idx on public.erp_convites_acesso(auth_user_id);
create unique index if not exists erp_master_unico_ativo_idx on public.erp_usuarios ((is_master)) where is_master = true and ativo = true and deleted_at is null;
create unique index if not exists erp_convite_email_pendente_idx on public.erp_convites_acesso (lower(email)) where concluido_em is null and cancelado_em is null;
revoke all on public.erp_convites_acesso from anon, authenticated;
grant select, insert, update, delete on public.erp_convites_acesso to service_role;