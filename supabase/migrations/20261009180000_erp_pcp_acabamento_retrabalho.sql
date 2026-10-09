-- PCP Acabamento: rastrear separadamente peças acabadas, refugadas e em retrabalho.
alter table public.erp_acabamentos
  add column if not exists quantidade_retrabalho numeric(14,3) not null default 0
  check (quantidade_retrabalho >= 0);
