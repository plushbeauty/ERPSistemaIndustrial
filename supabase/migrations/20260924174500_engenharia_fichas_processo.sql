create table if not exists public.engenharia_fichas_processo (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
 produto_id uuid references public.produtos(id), codigo text not null, versao integer not null default 1, titulo text not null, descricao text,
 status text not null default 'rascunho' check(status in ('rascunho','em_analise','aprovado','liberado','obsoleto')), observacoes text,
 criado_por uuid references public.usuarios(id), aprovado_por uuid references public.usuarios(id), aprovado_em timestamptz,
 liberado_por uuid references public.usuarios(id), liberado_em timestamptz, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(empresa_id,codigo,versao)
);
create table if not exists public.engenharia_ficha_operacoes (
 id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.empresas(id) on delete restrict,
 ficha_id uuid not null references public.engenharia_fichas_processo(id) on delete cascade, sequencia integer not null, operacao text not null,
 parametro_nominal numeric(18,6), tolerancia_min numeric(18,6), tolerancia_max numeric(18,6), unidade text,
 instrumento text, criterio_aceitacao text, observacoes text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(ficha_id,sequencia)
);
alter table public.engenharia_fichas_processo enable row level security;
alter table public.engenharia_ficha_operacoes enable row level security;
create policy engenharia_fichas_select on public.engenharia_fichas_processo for select to authenticated using(is_master_user() or empresa_id=current_empresa_id());
create policy engenharia_fichas_insert on public.engenharia_fichas_processo for insert to authenticated with check(is_master_user() or empresa_id=current_empresa_id());
create policy engenharia_fichas_update on public.engenharia_fichas_processo for update to authenticated using(is_master_user() or empresa_id=current_empresa_id()) with check(is_master_user() or empresa_id=current_empresa_id());
create policy engenharia_operacoes_select on public.engenharia_ficha_operacoes for select to authenticated using(is_master_user() or empresa_id=current_empresa_id());
create policy engenharia_operacoes_insert on public.engenharia_ficha_operacoes for insert to authenticated with check(is_master_user() or empresa_id=current_empresa_id());
create policy engenharia_operacoes_update on public.engenharia_ficha_operacoes for update to authenticated using(is_master_user() or empresa_id=current_empresa_id()) with check(is_master_user() or empresa_id=current_empresa_id());
create policy engenharia_operacoes_delete on public.engenharia_ficha_operacoes for delete to authenticated using(is_master_user() or empresa_id=current_empresa_id());