create or replace function public.erp_pcp_vincular_requisicoes_a_op()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.ordem_producao_id is not null and new.ordem_producao_id is distinct from old.ordem_producao_id then
  if not exists(select 1 from public.erp_ordens_producao where id=new.ordem_producao_id and empresa_id=new.empresa_id) then
   raise exception 'OP_NAO_PERTENCE_A_EMPRESA_DA_FILA_PCP';
  end if;
  update public.erp_requisicoes_compra set ordem_producao_id=new.ordem_producao_id
  where empresa_id=new.empresa_id and pcp_fila_id=new.id and ordem_producao_id is null;
 end if;
 return new;
end; $$;