begin;

alter table public.erp_equipamentos_medicao
  add column if not exists proxima_calibracao date,
  add column if not exists certificado_validade date;

create index if not exists idx_erp_equipamentos_medicao_empresa_proxima_calibracao
  on public.erp_equipamentos_medicao (empresa_id, proxima_calibracao);

notify pgrst, 'reload schema';
commit;
