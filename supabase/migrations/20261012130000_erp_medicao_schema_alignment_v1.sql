begin;

-- Align the existing metrology-equipment table with the fields already used by
-- calibration and quality screens. Preserve existing records and tenant keys.
alter table public.erp_equipamentos_medicao
  add column if not exists equipamento text,
  add column if not exists numero_serie text,
  add column if not exists faixa_medicao text,
  add column if not exists setor text,
  add column if not exists responsavel text,
  add column if not exists certificado_rbc boolean not null default false,
  add column if not exists tolerancia_nominal numeric(14,6),
  add column if not exists erro_maximo numeric(14,6),
  add column if not exists unidade_medida text,
  add column if not exists observacoes text;

-- Backfill only from semantically equivalent existing fields.
update public.erp_equipamentos_medicao
set equipamento = coalesce(nullif(equipamento,''), descricao),
    faixa_medicao = coalesce(nullif(faixa_medicao,''), faixa),
    setor = coalesce(nullif(setor,''), setor_localizacao),
    unidade_medida = coalesce(nullif(unidade_medida,''), unidade)
where equipamento is null
   or faixa_medicao is null
   or setor is null
   or unidade_medida is null;

create index if not exists idx_erp_equipamentos_medicao_empresa_codigo
  on public.erp_equipamentos_medicao (empresa_id, codigo);

notify pgrst, 'reload schema';
commit;