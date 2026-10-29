-- SYNQRA ERP INDUSTRIAL — PCP, auditoria contextual e política global de senha
-- Revisão: 2026-10-29 | Aditiva; não altera telas aprovadas nem tabelas operacionais existentes.
begin;

create table if not exists public.erp_synqra_discuss_message (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  res_model text not null check (res_model in ('erp_ordens_producao','erp_estoque_lotes_rastreabilidade','erp_recebimento_notas','erp_pcp_bom_itens')),
  res_id uuid not null,
  autor_auth_id uuid not null references auth.users(id) on delete restrict,
  corpo text not null check (length(btrim(corpo)) between 1 and 10000),
  tipo_mensagem text not null default 'Comentario' check (tipo_mensagem in ('Comentario','Notificacao_Sistema')),
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_synqra_discuss_documento
  on public.erp_synqra_discuss_message (empresa_id, res_model, res_id, created_at);

create table if not exists public.erp_synqra_rating (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  res_model text not null check (res_model in ('erp_ordens_producao','erp_estoque_lotes_rastreabilidade','erp_recebimento_notas','erp_pcp_bom_itens')),
  res_id uuid not null,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (comentario is null or length(comentario) <= 5000),
  operador_auth_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_synqra_rating_documento
  on public.erp_synqra_rating (empresa_id, res_model, res_id, created_at desc);

alter table public.erp_synqra_discuss_message enable row level security;
alter table public.erp_synqra_rating enable row level security;
revoke all on public.erp_synqra_discuss_message, public.erp_synqra_rating from anon, public;
grant select, insert on public.erp_synqra_discuss_message, public.erp_synqra_rating to authenticated;

drop policy if exists erp_synqra_discuss_select_tenant on public.erp_synqra_discuss_message;
create policy erp_synqra_discuss_select_tenant on public.erp_synqra_discuss_message
for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists erp_synqra_discuss_insert_tenant on public.erp_synqra_discuss_message;
create policy erp_synqra_discuss_insert_tenant on public.erp_synqra_discuss_message
for insert to authenticated with check (
  empresa_id = public.erp_current_empresa_id() and autor_auth_id = auth.uid()
);
drop policy if exists erp_synqra_rating_select_tenant on public.erp_synqra_rating;
create policy erp_synqra_rating_select_tenant on public.erp_synqra_rating
for select to authenticated using (empresa_id = public.erp_current_empresa_id());
drop policy if exists erp_synqra_rating_insert_tenant on public.erp_synqra_rating;
create policy erp_synqra_rating_insert_tenant on public.erp_synqra_rating
for insert to authenticated with check (
  empresa_id = public.erp_current_empresa_id() and operador_auth_id = auth.uid()
);

-- Política global de cadastro de senha; somente identidade Master autenticada pode alterar.
create table if not exists public.erp_sistema_politica_senha (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  comprimento_minimo integer not null default 8 check (comprimento_minimo between 8 and 128),
  exigir_maiuscula boolean not null default true,
  exigir_numero boolean not null default true,
  atualizado_por uuid references auth.users(id) on delete set null,
  atualizado_em timestamptz not null default now()
);
insert into public.erp_sistema_politica_senha (singleton, comprimento_minimo, exigir_maiuscula, exigir_numero)
values (true, 8, true, true)
on conflict (singleton) do nothing;

alter table public.erp_sistema_politica_senha enable row level security;
revoke all on public.erp_sistema_politica_senha from anon, public;
grant select, update on public.erp_sistema_politica_senha to authenticated;
drop policy if exists erp_sistema_politica_senha_master_select on public.erp_sistema_politica_senha;
create policy erp_sistema_politica_senha_master_select on public.erp_sistema_politica_senha
for select to authenticated using (public.erp_is_master());
drop policy if exists erp_sistema_politica_senha_master_update on public.erp_sistema_politica_senha;
create policy erp_sistema_politica_senha_master_update on public.erp_sistema_politica_senha
for update to authenticated using (public.erp_is_master())
with check (public.erp_is_master() and atualizado_por = auth.uid());

comment on table public.erp_synqra_discuss_message is 'Histórico contextual por empresa; autor derivado da sessão autenticada.';
comment on table public.erp_synqra_rating is 'Avaliações de conformidade de 1 a 5 vinculadas à empresa e à sessão.';
comment on table public.erp_sistema_politica_senha is 'Política global de complexidade para cadastro; alterações restritas a Master.';

commit;
