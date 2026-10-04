alter table public.erp_ordens_producao
  add column if not exists cliente_id uuid references public.erp_clientes(id),
  add column if not exists prioridade text not null default 'REGULAR';

alter table public.erp_ordens_producao drop constraint if exists erp_ordens_producao_prioridade_check;
alter table public.erp_ordens_producao add constraint erp_ordens_producao_prioridade_check check (prioridade in ('ALTA','REGULAR','BAIXA'));

create index if not exists idx_erp_ordens_producao_cliente on public.erp_ordens_producao(cliente_id);