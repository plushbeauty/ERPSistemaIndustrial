begin;

-- Campos complementares do formulário RNC conforme o PDF de qualidade.
alter table public.erp_rpnc
  add column if not exists data_ocorrencia timestamptz not null default now(),
  add column if not exists inspetor_id uuid null references public.erp_usuarios(id) on delete set null,
  add column if not exists disposicao_fisica text,
  add column if not exists porques_evidencias jsonb not null default '[]'::jsonb,
  add column if not exists causa_raiz_validada boolean not null default false,
  add column if not exists causa_raiz_validacao_observacao text,
  add column if not exists requisito_violado text,
  add column if not exists evidencias_objetivas jsonb not null default '[]'::jsonb,
  add column if not exists quantidade_afetada numeric(14,3);

alter table public.erp_qualidade_8d
  add column if not exists rpnc_snapshot jsonb,
  add column if not exists snapshot_capturado_em timestamptz,
  add column if not exists cliente_referencia text,
  add column if not exists origem_rpnc text,
  add column if not exists numero_rpnc_origem text;

create index if not exists idx_erp_rpnc_empresa_data_ocorrencia
  on public.erp_rpnc (empresa_id, data_ocorrencia desc);
create index if not exists idx_erp_rpnc_empresa_gravidade_status
  on public.erp_rpnc (empresa_id, gravidade, status);

-- A fotografia do RNC no 8D é imutável após a primeira captura.
create or replace function public.erp_qualidade_8d_proteger_snapshot()
returns trigger
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'O protocolo 8D não pode ser excluído; encerre-o conforme o fluxo de qualidade.';
  end if;
  if old.rpnc_snapshot is not null and new.rpnc_snapshot is distinct from old.rpnc_snapshot then
    raise exception 'A fotografia histórica da RPNC vinculada ao 8D é imutável.';
  end if;
  if old.rpnc_id is not null and new.rpnc_id is distinct from old.rpnc_id then
    raise exception 'A RPNC de origem do protocolo 8D não pode ser substituída após o vínculo.';
  end if;
  if old.snapshot_capturado_em is not null and new.snapshot_capturado_em is distinct from old.snapshot_capturado_em then
    raise exception 'A data da captura histórica do 8D é imutável.';
  end if;
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists trg_erp_qualidade_8d_proteger_snapshot on public.erp_qualidade_8d;
create trigger trg_erp_qualidade_8d_proteger_snapshot
before update or delete on public.erp_qualidade_8d
for each row execute function public.erp_qualidade_8d_proteger_snapshot();

-- RLS já está ativa na tabela 8D; reforçar integridade de vínculo tenant.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_qualidade_8d_empresa_rpnc_fk'
      and conrelid = 'public.erp_qualidade_8d'::regclass
  ) then
    alter table public.erp_qualidade_8d
      add constraint erp_qualidade_8d_empresa_rpnc_fk
      foreign key (empresa_id,rpnc_id)
      references public.erp_rpnc (empresa_id,id)
      on delete restrict;
  end if;
end
$$;

commit;
