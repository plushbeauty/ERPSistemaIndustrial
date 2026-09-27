create table if not exists public.erp_auditoria_logs (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid null references public.erp_empresas(id),
  tabela_afetada text not null,
  acao text not null check (acao in ('INSERT','UPDATE','DELETE')),
  dados_antigos jsonb null,
  dados_novos jsonb null,
  executado_por uuid null,
  executado_em timestamptz not null default now()
);

create index if not exists idx_erp_auditoria_logs_empresa_tempo
  on public.erp_auditoria_logs (empresa_id, executado_em desc);
create index if not exists idx_erp_auditoria_logs_tabela_tempo
  on public.erp_auditoria_logs (tabela_afetada, executado_em desc);

alter table public.erp_auditoria_logs enable row level security;

drop policy if exists "erp_auditoria_logs_select_tenant" on public.erp_auditoria_logs;
create policy "erp_auditoria_logs_select_tenant"
on public.erp_auditoria_logs for select to authenticated
using (
  empresa_id = public.erp_current_empresa_id()
  or exists (
    select 1 from public.erp_usuarios u
    where u.auth_user_id = (select auth.uid())
      and u.ativo = true
      and u.deleted_at is null
      and coalesce(u.nivel_admin, 0) >= 100
      and upper(coalesce(u.perfil, '')) = 'MASTER'
      and u.empresa_id is null
  )
);

revoke insert, update, delete on public.erp_auditoria_logs from anon, authenticated;
grant select on public.erp_auditoria_logs to authenticated;

create or replace function public.erp_auditoria_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa_id uuid;
begin
  if TG_OP = 'DELETE' then
    v_empresa_id := nullif(to_jsonb(OLD)->>'empresa_id', '')::uuid;
  else
    v_empresa_id := nullif(to_jsonb(NEW)->>'empresa_id', '')::uuid;
  end if;

  insert into public.erp_auditoria_logs (
    empresa_id, tabela_afetada, acao, dados_antigos, dados_novos, executado_por
  )
  values (
    v_empresa_id,
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    TG_OP,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(OLD) end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(NEW) end,
    auth.uid()
  );

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

revoke execute on function public.erp_auditoria_trigger() from public, anon, authenticated;

drop trigger if exists trg_erp_auditoria_fichas_processo on public.erp_fichas_processo;
create trigger trg_erp_auditoria_fichas_processo
after insert or update or delete on public.erp_fichas_processo
for each row execute function public.erp_auditoria_trigger();

drop trigger if exists trg_erp_auditoria_rncs on public.erp_rncs;
create trigger trg_erp_auditoria_rncs
after insert or update or delete on public.erp_rncs
for each row execute function public.erp_auditoria_trigger();

drop trigger if exists trg_erp_auditoria_pedidos_venda on public.erp_pedidos_venda;
create trigger trg_erp_auditoria_pedidos_venda
after insert or update or delete on public.erp_pedidos_venda
for each row execute function public.erp_auditoria_trigger();

drop trigger if exists trg_erp_auditoria_lotes_rastreabilidade on public.erp_estoque_lotes_rastreabilidade;
create trigger trg_erp_auditoria_lotes_rastreabilidade
after insert or update or delete on public.erp_estoque_lotes_rastreabilidade
for each row execute function public.erp_auditoria_trigger();

alter table public.erp_apontamentos_processo
  add column if not exists client_transaction_id uuid;

create unique index if not exists uq_erp_apontamentos_processo_client_transaction
  on public.erp_apontamentos_processo (client_transaction_id)
  where client_transaction_id is not null;
