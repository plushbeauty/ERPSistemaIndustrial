-- SYSNQRA ERP INDUSTRIAL — RH: avaliações, acidentes e documentos
-- Aditiva e não destrutiva: não remove tabelas, colunas ou registros existentes.
begin;

create table if not exists public.erp_rh_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete restrict,
  data_avaliacao date not null,
  tipo text not null,
  avaliador text not null,
  nota numeric(8,2),
  resultado text,
  plano_acao text,
  observacoes text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  constraint erp_rh_avaliacoes_nota_range check (nota is null or (nota >= 0 and nota <= 100))
);

create table if not exists public.erp_rh_acidentes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete restrict,
  data_ocorrencia date not null,
  hora_ocorrencia time,
  local text not null,
  tipo text not null,
  gravidade text not null,
  descricao text not null,
  afastamento_dias integer not null default 0 check (afastamento_dias >= 0),
  providencias text,
  status text not null default 'ABERTO',
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.erp_rh_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  funcionario_id uuid not null references public.erp_funcionarios(id) on delete restrict,
  tipo_documento text not null,
  titulo text not null,
  numero_documento text,
  data_emissao date,
  validade_ate date,
  documento_path text,
  observacoes text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  constraint erp_rh_documentos_validade check (validade_ate is null or data_emissao is null or validade_ate >= data_emissao)
);

create index if not exists idx_erp_rh_avaliacoes_empresa_data on public.erp_rh_avaliacoes(empresa_id, data_avaliacao desc);
create index if not exists idx_erp_rh_acidentes_empresa_data on public.erp_rh_acidentes(empresa_id, data_ocorrencia desc);
create index if not exists idx_erp_rh_documentos_empresa_validade on public.erp_rh_documentos(empresa_id, validade_ate);

do $$
declare t text;
begin
  foreach t in array array['erp_rh_avaliacoes','erp_rh_acidentes','erp_rh_documentos']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_guard', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id())) with check ((select public.erp_is_master()) or empresa_id = (select public.erp_current_empresa_id()))',
      t || '_tenant_guard', t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

commit;
