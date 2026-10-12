-- Enforce quality/quarantine constraints at the database boundary so a lot
-- quarantined after draft creation cannot be forwarded, linked or consumed.
create or replace function private.erp_guard_liberacao_nf_quality()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_table_name = 'erp_liberacoes_nf_itens' then
    if not exists (
      select 1 from public.erp_estoque_lotes l
      where l.id=new.lote_id and l.empresa_id=new.empresa_id and l.produto_id=new.produto_id
        and upper(coalesce(l.status_inspecao,'')) in ('APROVADO','LIBERADO')
    ) then
      raise exception 'Somente lote aprovado e pertencente ao produto/empresa pode integrar a liberação.' using errcode='55000';
    end if;
    if exists (
      select 1 from public.erp_quarentenas_lotes q
      where q.empresa_id=new.empresa_id and q.lote_id=new.lote_id
        and upper(q.status) in ('RETIDO','SUCATA','RETRABALHO')
    ) then
      raise exception 'Lote em quarentena, sucata ou retrabalho não pode ser liberado para NF-e.' using errcode='55000';
    end if;
    return new;
  end if;

  if new.status in ('ENCAMINHADA','VINCULADA_NFE','CONCLUIDA')
     and (tg_op='INSERT' or new.status is distinct from old.status)
     and exists (
       select 1
       from public.erp_liberacoes_nf_itens i
       join public.erp_estoque_lotes l
         on l.id=i.lote_id and l.empresa_id=i.empresa_id and l.produto_id=i.produto_id
       where i.liberacao_id=new.id and i.empresa_id=new.empresa_id
         and (
           upper(coalesce(l.status_inspecao,'')) not in ('APROVADO','LIBERADO')
           or exists (
             select 1 from public.erp_quarentenas_lotes q
             where q.empresa_id=i.empresa_id and q.lote_id=i.lote_id
               and upper(q.status) in ('RETIDO','SUCATA','RETRABALHO')
           )
         )
     ) then
    raise exception 'A liberação contém lote bloqueado ou em quarentena; regularize a Qualidade antes de prosseguir.' using errcode='55000';
  end if;
  return new;
end;
$$;

drop trigger if exists erp_liberacao_nf_item_quality_guard on public.erp_liberacoes_nf_itens;
create trigger erp_liberacao_nf_item_quality_guard
before insert or update on public.erp_liberacoes_nf_itens
for each row execute function private.erp_guard_liberacao_nf_quality();

drop trigger if exists erp_liberacao_nf_header_quality_insert_guard on public.erp_liberacoes_nf;
create trigger erp_liberacao_nf_header_quality_insert_guard
before insert on public.erp_liberacoes_nf
for each row execute function private.erp_guard_liberacao_nf_quality();

drop trigger if exists erp_liberacao_nf_header_quality_status_guard on public.erp_liberacoes_nf;
create trigger erp_liberacao_nf_header_quality_status_guard
before update of status on public.erp_liberacoes_nf
for each row execute function private.erp_guard_liberacao_nf_quality();

revoke all on function private.erp_guard_liberacao_nf_quality() from public, anon, authenticated;
