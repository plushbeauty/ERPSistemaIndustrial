create or replace function public.erp_pcp_vincular_requisicoes_a_op()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
 if new.ordem_producao_id is not null and new.ordem_producao_id is distinct from old.ordem_producao_id then
  update public.erp_requisicoes_compra
   set ordem_producao_id=new.ordem_producao_id
  where empresa_id=new.empresa_id and pcp_fila_id=new.id and ordem_producao_id is null;
 end if;
 return new;
end;
$$;
revoke all on function public.erp_pcp_vincular_requisicoes_a_op() from public,anon,authenticated;
drop trigger if exists trg_erp_pcp_vincular_requisicoes_a_op on public.erp_pcp_fila_demanda;
create trigger trg_erp_pcp_vincular_requisicoes_a_op
after update of ordem_producao_id on public.erp_pcp_fila_demanda
for each row execute function public.erp_pcp_vincular_requisicoes_a_op();