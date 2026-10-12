-- SGQ: completar contrato de inspeção em processo e normalizar tipo documental.
-- Migração aditiva; preserva todos os registros existentes.
alter table public.erp_inspecoes
  add column if not exists maquina_id uuid,
  add column if not exists inspetor_nome text,
  add column if not exists medicoes jsonb not null default '[]'::jsonb,
  add column if not exists acao_bloqueio text not null default 'NENHUMA';

alter table public.erp_documentos_qualidade
  add column if not exists tipo text not null default 'procedimento';

create index if not exists erp_inspecoes_empresa_created_at_idx
  on public.erp_inspecoes (empresa_id, created_at desc);
create index if not exists erp_documentos_qualidade_empresa_codigo_idx
  on public.erp_documentos_qualidade (empresa_id, codigo);

comment on column public.erp_inspecoes.medicoes is 'Medições dimensionais do laudo em array JSON.';
comment on column public.erp_inspecoes.acao_bloqueio is 'Ação de contenção quando o resultado não é aprovado.';
comment on column public.erp_documentos_qualidade.tipo is 'Tipo documental controlado do SGQ.';
