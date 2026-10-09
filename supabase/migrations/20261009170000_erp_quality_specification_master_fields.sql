-- Campos mestres de especificação conforme Projeto Executivo ERP Industrial (PDF).
-- Mantém os critérios existentes e acrescenta metadados para recebimento, processo e inspeção final.
alter table public.erp_planos_inspecao
  add column if not exists grupo_material text,
  add column if not exists tipo_inspecao text not null default 'RECEBIMENTO',
  add column if not exists metodo_inspecao text not null default 'DIMENSIONAL',
  add column if not exists condicao_armazenamento text,
  add column if not exists instrumento_id uuid null references public.erp_equipamentos_medicao(id) on delete set null,
  add column if not exists revisao integer not null default 1,
  add column if not exists vigencia_inicio date,
  add column if not exists responsavel_id uuid null references auth.users(id) on delete set null,
  add column if not exists aprovador_id uuid null references auth.users(id) on delete set null;

alter table public.erp_planos_inspecao
  drop constraint if exists erp_planos_inspecao_tipo_inspecao_check,
  add constraint erp_planos_inspecao_tipo_inspecao_check
    check (tipo_inspecao in ('RECEBIMENTO','PROCESSO','FINAL','EXPEDICAO')),
  drop constraint if exists erp_planos_inspecao_metodo_inspecao_check,
  add constraint erp_planos_inspecao_metodo_inspecao_check
    check (metodo_inspecao in ('VISUAL','DIMENSIONAL','FUNCIONAL','DOCUMENTAL')),
  drop constraint if exists erp_planos_inspecao_revisao_check,
  add constraint erp_planos_inspecao_revisao_check check (revisao > 0);

create index if not exists idx_erp_planos_inspecao_tipo_status
  on public.erp_planos_inspecao(empresa_id, tipo_inspecao, status, codigo);
