-- Quality specifications need a controlled nominal and an explicit link from each dimensional sample.
alter table public.erp_planos_inspecao
  add column if not exists nominal numeric(14,5);

do $$
begin
  alter table public.erp_planos_inspecao
    add constraint erp_planos_inspecao_nominal_bounds_check
    check (
      nominal is null
      or (
        (limite_inferior is null or nominal >= limite_inferior)
        and (limite_superior is null or nominal <= limite_superior)
      )
    );
exception when duplicate_object then null;
end;
$$;

alter table public.erp_qualidade_inspecoes_dimensionais
  add column if not exists plano_inspecao_id uuid
  references public.erp_planos_inspecao(id) on delete restrict;

create index if not exists idx_qms_dimensional_plan
  on public.erp_qualidade_inspecoes_dimensionais(empresa_id, inspecao_recebimento_id, plano_inspecao_id);

create or replace function public.erp_qms_validar_vinculo_dimensional()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_spec_empresa uuid;
  v_spec_produto uuid;
  v_lote_produto uuid;
begin
  if new.plano_inspecao_id is null then
    return new;
  end if;

  select p.empresa_id, p.produto_id
    into v_spec_empresa, v_spec_produto
  from public.erp_planos_inspecao p
  where p.id = new.plano_inspecao_id;

  if not found or v_spec_empresa is distinct from new.empresa_id then
    raise exception 'Especificação técnica inexistente ou pertencente a outra empresa.';
  end if;

  if new.inspecao_recebimento_id is not null then
    select l.produto_id into v_lote_produto
    from public.erp_qualidade_inspecoes_recebimento r
    join public.erp_estoque_lotes l
      on l.id = r.lote_id and l.empresa_id = r.empresa_id
    where r.id = new.inspecao_recebimento_id
      and r.empresa_id = new.empresa_id;

    if not found or v_lote_produto is distinct from v_spec_produto then
      raise exception 'A especificação técnica não pertence ao produto do lote inspecionado.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_erp_qms_validar_vinculo_dimensional on public.erp_qualidade_inspecoes_dimensionais;
create trigger trg_erp_qms_validar_vinculo_dimensional
before insert or update
on public.erp_qualidade_inspecoes_dimensionais
for each row execute function public.erp_qms_validar_vinculo_dimensional();

revoke all on function public.erp_qms_validar_vinculo_dimensional() from public, anon, authenticated;
