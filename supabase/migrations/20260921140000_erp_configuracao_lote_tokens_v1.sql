-- 📝 IDENTIFICAÇÃO DE LEITURA E REVISÃO DE CÓDIGO:
-- Arquivo: supabase/migrations/20260921140000_erp_configuracao_lote_tokens_v1.sql
-- Status Atual: Revisão 1
-- Total de Linhas Lido/Gerado: 45
-- Assinatura de Entrada (Primeiros 3 Imports): SQL DDL; SQL DML; SQL RLS
-- Integração Concretizada: public.erp_configuracoes_lote, tenant ERP e índice de configuração ativa.

create table if not exists public.erp_configuracoes_lote (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  nome text not null default 'Padrão',
  ativo boolean not null default true,
  tokens jsonb not null default '["pedido","produto","data"]'::jsonb,
  separador text not null default '-',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.erp_usuarios(id),
  constraint erp_configuracoes_lote_tokens_array check (jsonb_typeof(tokens) = 'array'),
  constraint erp_configuracoes_lote_separador check (length(separador) between 1 and 3)
);

create unique index if not exists ux_erp_configuracoes_lote_ativa
  on public.erp_configuracoes_lote(empresa_id) where ativo = true;

alter table public.erp_configuracoes_lote enable row level security;

drop policy if exists erp_config_lote_select on public.erp_configuracoes_lote;
create policy erp_config_lote_select on public.erp_configuracoes_lote for select to authenticated using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_config_lote_insert on public.erp_configuracoes_lote;
create policy erp_config_lote_insert on public.erp_configuracoes_lote for insert to authenticated with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_config_lote_update on public.erp_configuracoes_lote;
create policy erp_config_lote_update on public.erp_configuracoes_lote for update to authenticated using (empresa_id = public.erp_current_empresa_id()) with check (empresa_id = public.erp_current_empresa_id());

create or replace function public.erp_config_lote_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_erp_config_lote_touch on public.erp_configuracoes_lote;
create trigger trg_erp_config_lote_touch before update on public.erp_configuracoes_lote for each row execute function public.erp_config_lote_touch();

grant select, insert, update on public.erp_configuracoes_lote to authenticated;
