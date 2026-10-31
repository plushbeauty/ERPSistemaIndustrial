begin;

-- SYSNQRA ERP INDUSTRIAL | SGQ/RPNC | consolidação Ishikawa 6M e 5 Porquês.
-- Aditiva: mantém o fluxo RPC existente e não substitui o protocolo atual.
alter table public.erp_rpnc
  add column if not exists ishikawa_data jsonb not null default
    '{"Metodo":[],"Maquina":[],"Medida":[],"MeioAmbiente":[],"MaoDeObra":[],"Material":[]}'::jsonb,
  add column if not exists cinco_porques jsonb not null default '[]'::jsonb,
  add column if not exists quarentena_dados jsonb not null default '{}'::jsonb;

-- Normaliza registros legados para o contrato 6M antes de impor a validação.
update public.erp_rpnc
set ishikawa_data =
  jsonb_build_object(
    'Metodo', case when jsonb_typeof(ishikawa_data->'Metodo') = 'array' then ishikawa_data->'Metodo' else '[]'::jsonb end,
    'Maquina', case when jsonb_typeof(ishikawa_data->'Maquina') = 'array' then ishikawa_data->'Maquina' else '[]'::jsonb end,
    'Medida', case when jsonb_typeof(ishikawa_data->'Medida') = 'array' then ishikawa_data->'Medida' else '[]'::jsonb end,
    'MeioAmbiente', case when jsonb_typeof(ishikawa_data->'MeioAmbiente') = 'array' then ishikawa_data->'MeioAmbiente' else '[]'::jsonb end,
    'MaoDeObra', case when jsonb_typeof(ishikawa_data->'MaoDeObra') = 'array' then ishikawa_data->'MaoDeObra' else '[]'::jsonb end,
    'Material', case when jsonb_typeof(ishikawa_data->'Material') = 'array' then ishikawa_data->'Material' else '[]'::jsonb end
  )
where jsonb_typeof(ishikawa_data) is distinct from 'object'
   or jsonb_typeof(ishikawa_data->'Metodo') is distinct from 'array'
   or jsonb_typeof(ishikawa_data->'Maquina') is distinct from 'array'
   or jsonb_typeof(ishikawa_data->'Medida') is distinct from 'array'
   or jsonb_typeof(ishikawa_data->'MeioAmbiente') is distinct from 'array'
   or jsonb_typeof(ishikawa_data->'MaoDeObra') is distinct from 'array'
   or jsonb_typeof(ishikawa_data->'Material') is distinct from 'array';

alter table public.erp_rpnc
  drop constraint if exists erp_rpnc_ishikawa_data_6m_ck;
alter table public.erp_rpnc
  add constraint erp_rpnc_ishikawa_data_6m_ck check (
    jsonb_typeof(ishikawa_data) = 'object'
    and jsonb_typeof(ishikawa_data->'Metodo') = 'array'
    and jsonb_typeof(ishikawa_data->'Maquina') = 'array'
    and jsonb_typeof(ishikawa_data->'Medida') = 'array'
    and jsonb_typeof(ishikawa_data->'MeioAmbiente') = 'array'
    and jsonb_typeof(ishikawa_data->'MaoDeObra') = 'array'
    and jsonb_typeof(ishikawa_data->'Material') = 'array'
  );

alter table public.erp_rpnc
  drop constraint if exists erp_rpnc_cinco_porques_array_ck;
alter table public.erp_rpnc
  add constraint erp_rpnc_cinco_porques_array_ck
  check (jsonb_typeof(cinco_porques) = 'array');

comment on column public.erp_rpnc.ishikawa_data is
  'Análise de causa raiz 6M unificada para RPNC; arrays por categoria.';
comment on column public.erp_rpnc.cinco_porques is
  'Respostas sequenciais da metodologia dos 5 Porquês para RPNC.';
comment on column public.erp_rpnc.quarentena_dados is
  'Metadados de segregação vinculados à RPNC; não altera saldo sem transação de estoque validada.';

commit;
